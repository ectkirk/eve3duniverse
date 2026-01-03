#!/usr/bin/env python3
"""
Build shader-presets.json by extracting data from EVE .black files

This script:
1. Reads graphics.yaml to get graphicID -> file path mapping
2. Downloads .black files from EVE CDN using curl
3. Parses each .black file to extract textures and parameters
4. Outputs a comprehensive shader-presets.json
"""

import struct
import json
import sys
import os
import subprocess
import tempfile
from pathlib import Path

class BlackParser:
    TEXTURE_NAMES = [
        'DistortionMap', 'HeightMap', 'NoiseMap', 'PolesMaskMap',
        'RingsTexture', 'ColorGradientMap', 'GradientMap', 'MaskMap',
        'NoiseTexture', 'FillTexture', 'CloudsTexture', 'CloudCapTexture',
        'CityLight', 'NormalHeight1', 'NormalHeight2', 'Lava3DNoiseMap',
        'LightningMap', 'GroundScattering1', 'GroundScattering2',
        'PolesGradient', 'ColorizeMap', 'CityDistributionMask',
        'CityDistributionTexture'
    ]

    VEC4_PARAM_NAMES = [
        # Gas Giant
        'WindFactors', 'BandingSpeed', 'CapColor', 'DistoFactors', 'Saturation',
        'RingsFactors', 'ringColor1', 'ringColor2', 'ringColor3', 'Alpha',
        # Ice
        'IceFactors', 'IceDetail', 'IceSpecular',
        'IceRampColorLow', 'IceRampColorMiddle', 'IceRampColorHigh',
        # Lava
        'AnimationFactors', 'DetailFactors', 'LavaColor1', 'LavaColor2',
        'LavaSpecular', 'MiscFactors',
        # Atmosphere
        'AtmosphereFactors', 'ScatteringFactors', 'AtmosphereColor',
        # Common
        'ColorParams', 'GeometryDeformation', 'GeometryAnimation',
        'CloudSpeed', 'CloudsColor', 'CloudsFactors',
        # Thunderstorm
        'LightningColor', 'LightningFactors',
    ]

    def __init__(self, data: bytes):
        self.data = data
        self.strings = []
        self.parse_header()

    def parse_header(self):
        magic, version, str_len = struct.unpack('<III', self.data[:12])
        if magic != 0xb1acf11e:
            raise ValueError(f"Invalid magic: {hex(magic)}")

        str_data = self.data[12:12 + str_len]
        current = b''
        for byte in str_data:
            if byte == 0:
                if current:
                    self.strings.append(current.decode('utf-8', errors='replace'))
                current = b''
            else:
                current += bytes([byte])
        if current:
            self.strings.append(current.decode('utf-8', errors='replace'))

        self.data_start = 12 + str_len
        self.data_section = self.data[self.data_start:]

        self.vec4_type_idx = self._find_string_index('Tr2Vector4Parameter')
        self.name_to_idx = {}
        for name in self.VEC4_PARAM_NAMES:
            idx = self._find_string_index(name)
            if idx >= 0:
                self.name_to_idx[name] = idx

    def _find_string_index(self, name):
        for i, s in enumerate(self.strings):
            if s == name:
                return i
        return -1

    TEXTURE_REMAPS = {
        'plasma/plasma_lightning01_g': 'thunderstorm/lightning01_g',
        'plasma/plasma_lightning02_g': 'thunderstorm/lightning02_g',
    }

    def extract_textures(self):
        textures = {}
        for i, s in enumerate(self.strings):
            if s in self.TEXTURE_NAMES:
                for j in range(i+1, min(i+5, len(self.strings))):
                    if self.strings[j].startswith('res:'):
                        path = self.strings[j]
                        if '/worldobject/planet/' in path:
                            path = path.split('/worldobject/planet/')[-1]
                        elif '/texture/global/' in path:
                            path = 'global/' + path.split('/texture/global/')[-1]
                        elif '/texture/fx/' in path:
                            continue
                        else:
                            continue
                        path = path.replace('.dds', '.webp')
                        base = path.rsplit('.', 1)[0]
                        if base in self.TEXTURE_REMAPS:
                            path = self.TEXTURE_REMAPS[base] + '.webp'
                        textures[s] = path
                        break
        return textures

    def extract_parameters(self):
        """Extract vec4 shader parameters using two patterns:
        1. [name_idx:2][vec4:16] - vec4 at +2 offset
        2. [name_idx:2][padding:6][vec4:16] - vec4 at +8 offset (6 zero bytes padding)
        """
        params = {}
        ds = self.data_section

        # Scan for parameter name indices
        for i in range(0, len(ds) - 24, 2):
            idx = struct.unpack('<H', ds[i:i+2])[0]

            if idx not in self.name_to_idx.values():
                continue

            # Find the name for this index
            name = None
            for n, ni in self.name_to_idx.items():
                if ni == idx:
                    name = n
                    break

            if name is None or name in params:
                continue

            # Try pattern 1: vec4 at +2
            vals2 = None
            valid2 = False
            if i + 18 <= len(ds):
                vals2 = struct.unpack('<4f', ds[i+2:i+18])
                valid2 = self._is_valid_vec4_nonzero(vals2)

            # Try pattern 2: 6 zero bytes then vec4 at +8
            vals8 = None
            valid8 = False
            if i + 24 <= len(ds):
                padding = ds[i+2:i+8]
                is_padded = all(b == 0 for b in padding)
                if is_padded:
                    vals8 = struct.unpack('<4f', ds[i+8:i+24])
                    valid8 = self._is_valid_vec4_nonzero(vals8)

            # Choose the best match
            if valid2 and valid8:
                nz2 = sum(1 for v in vals2 if abs(v) > 0.0001)
                nz8 = sum(1 for v in vals8 if abs(v) > 0.0001)
                if nz8 >= nz2:
                    params[name] = [round(v, 6) for v in vals8]
                else:
                    params[name] = [round(v, 6) for v in vals2]
            elif valid8:
                params[name] = [round(v, 6) for v in vals8]
            elif valid2:
                params[name] = [round(v, 6) for v in vals2]

        return params

    def _is_valid_vec4_nonzero(self, vals):
        return (all(-1000 <= v <= 1000 for v in vals) and
                all(v == v for v in vals) and
                any(abs(v) > 0.0001 for v in vals))

    def get_type(self):
        for s in self.strings:
            s_lower = s.lower()
            if '/gasgiant' in s_lower:
                return 'gasgiant'
            elif '/earthlike' in s_lower:
                return 'terrestrial'
            elif '/lava' in s_lower:
                return 'lava'
            elif '/plasma' in s_lower:
                return 'plasma'
            elif '/ice' in s_lower:
                return 'ice'
            elif '/ocean' in s_lower:
                return 'ocean'
            elif '/thunderstorm' in s_lower:
                return 'thunderstorm'
            elif '/sandstorm' in s_lower:
                return 'sandstorm'
        return 'unknown'

def parse_graphics_yaml(yaml_path):
    """Parse graphics.yaml to get graphicID -> file path mapping for planets"""
    graphics = {}
    with open(yaml_path, 'r') as f:
        current_id = None
        for line in f:
            line = line.rstrip()
            if line and line[0].isdigit() and line.endswith(':'):
                current_id = int(line[:-1])
            elif current_id and 'graphicFile:' in line and 'Planet' in line:
                path = line.split('graphicFile:')[1].strip()
                if 'Template' in path or 'template' in path:
                    graphics[current_id] = path
                current_id = None
    return graphics

def convert_path_to_black(red_path):
    path = red_path.lower().replace('template_hi/', 'template/').replace('.red', '.black')
    return path

def load_resfileindex(index_path):
    index = {}
    with open(index_path, 'r') as f:
        for line in f:
            parts = line.strip().split(',')
            if len(parts) >= 2:
                index[parts[0]] = parts[1]
    return index

def download_black(hash_path, temp_dir):
    """Download .black file from EVE CDN using curl"""
    url = f"https://resources.eveonline.com/{hash_path}"
    temp_file = os.path.join(temp_dir, 'temp.black')

    result = subprocess.run(
        ['curl', '-sL', '-o', temp_file, url],
        capture_output=True,
        timeout=30
    )

    if result.returncode == 0 and os.path.exists(temp_file):
        with open(temp_file, 'rb') as f:
            data = f.read()
        os.remove(temp_file)
        if len(data) > 100:  # Valid file
            return data
    return None

def main():
    script_dir = Path(__file__).parent
    yaml_path = script_dir.parent / '.sde-yaml' / 'graphics.yaml'
    resfile_path = script_dir.parent / 'resfileindex.txt'
    output_path = script_dir.parent / 'src' / 'data' / 'shader-presets-full.json'

    if not yaml_path.exists():
        print(f"Error: {yaml_path} not found")
        sys.exit(1)
    if not resfile_path.exists():
        print(f"Error: {resfile_path} not found")
        sys.exit(1)

    print("Parsing graphics.yaml...")
    graphics = parse_graphics_yaml(yaml_path)
    print(f"Found {len(graphics)} planet graphics entries")

    print("Loading resfileindex.txt...")
    resindex = load_resfileindex(resfile_path)
    print(f"Loaded {len(resindex)} entries")

    presets = {}
    success = 0
    failed = 0

    with tempfile.TemporaryDirectory() as temp_dir:
        for gid, red_path in sorted(graphics.items()):
            black_path = convert_path_to_black(red_path)
            hash_path = resindex.get(black_path)

            if not hash_path:
                for key in resindex:
                    if key.lower() == black_path.lower():
                        hash_path = resindex[key]
                        break

            if not hash_path:
                failed += 1
                continue

            data = download_black(hash_path, temp_dir)
            if not data:
                failed += 1
                continue

            try:
                parser = BlackParser(data)
                preset = {
                    'type': parser.get_type(),
                    'textures': parser.extract_textures(),
                }
                params = parser.extract_parameters()
                if params:
                    preset['parameters'] = params
                presets[str(gid)] = preset
                success += 1
                if success % 50 == 0:
                    print(f"  Processed {success} presets...")
            except Exception as e:
                failed += 1

    print(f"\nProcessed {success} presets, {failed} failed")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(presets, f, indent=2)
    print(f"Saved to {output_path}")

if __name__ == '__main__':
    main()
