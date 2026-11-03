"""Merges the Roboflow COCO exports into one YOLO-format dataset with a shared class list.

Usage:
  python3 prepare_dataset.py <exports-dir> <output-dir>

<exports-dir> holds the unzipped Roboflow "COCO JSON" exports (one folder each, with
train/valid/test splits). <output-dir> receives images/ and labels/ per split plus
dataset.yaml for Ultralytics. Also writes src/features/recognition/detectorClasses.json
(class index -> [name, dish id | null]) for the app.

Sources (personal use; see README.md for licences):
  Indian_Food.v2i                     Royal0wl, CC BY 4.0
  Thali.v1i                           Calorie Detection, CC BY 4.0
  IndianFoodNet.v1-indianfoodnet-30   Agarwal et al., non-commercial research use
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP_CLASSES_JSON = os.path.join(HERE, '..', '..', 'src', 'features', 'recognition', 'detectorClasses.json')

# Detector class -> our dish id (None: no matching dish; the app offers it by name)
CLASSES = {
    'roti': 'roti',
    'puri': 'puri',
    'bhatura': 'bhatura',
    'rice': 'steamed_rice',
    'biryani': 'chicken_biryani',
    'dal': 'dal_tadka',
    'rajma': 'rajma',
    'chole': 'chole',
    'sambar': 'sambar',
    'idli': 'idli',
    'dosa': 'plain_dosa',
    'vada': 'medu_vada',
    'poha': 'poha',
    'sabzi': 'mix_veg',
    'curry': None,  # "wet curry": paneer, chicken or veg gravy — the user picks
    'aloo_gobi': 'aloo_gobi',
    'aloo_masala': 'aloo_sabzi',
    'dum_aloo': 'aloo_sabzi',
    'bhindi_masala': 'bhindi_masala',
    'palak_paneer': 'palak_paneer',
    'shahi_paneer': 'shahi_paneer',
    'chicken': 'chicken_curry',
    'mutton_curry': 'mutton_curry',
    'fish': 'fish_curry',
    'kebab': 'chicken_seekh_kebab',
    'egg': 'boiled_egg',
    'salad': 'kachumber',
    'curd': 'curd',
    'chutney': 'green_chutney',
    'coconut_chutney': 'coconut_chutney',
    'papad': 'papad',
    'samosa': 'samosa',
    'onion_pakoda': 'onion_pakora',
    'gulab_jamun': 'gulab_jamun',
    'jalebi': 'jalebi',
    'kheer': 'kheer',
    'kulfi': 'kulfi',
    'ras_malai': 'rasmalai',
    'ghevar': None,
    'sweet': None,
    'chai': 'masala_chai',
    'lassi': 'sweet_lassi',
}

# Each source's own category names -> our class names
SOURCE_CLASSES = {
    'Indian_Food.v2i': {
        'Roti': 'roti', 'Daal': 'dal', 'Rice': 'rice', 'dry-curry': 'sabzi', 'wet-curry': 'curry',
        'Salad': 'salad', 'Curd': 'curd', 'Sweet': 'sweet', 'sambhar': 'sambar', 'poori': 'puri',
        'chutney': 'chutney', 'idli': 'idli', 'biryani': 'biryani', 'vada': 'vada',
    },
    'Thali.v1i': {
        'rice': 'rice', 'sabzi': 'sabzi', 'dal': 'dal', 'roti': 'roti', 'chicken': 'chicken',
        'salad': 'salad', 'papad': 'papad', 'gulabjamun': 'gulab_jamun', 'fish': 'fish', 'egg': 'egg',
        'puri': 'puri',
    },
    'IndianFoodNet.v1-indianfoodnet-30': {
        'AlooGobi': 'aloo_gobi', 'AlooMasala': 'aloo_masala', 'Bhatura': 'bhatura',
        'BhindiMasala': 'bhindi_masala', 'Biryani': 'biryani', 'Chai': 'chai', 'Chole': 'chole',
        'CoconutChutney': 'coconut_chutney', 'Dal': 'dal', 'Dosa': 'dosa', 'DumAloo': 'dum_aloo',
        'FishCurry': 'fish', 'Ghevar': 'ghevar', 'GreenChutney': 'chutney', 'GulabJamun': 'gulab_jamun',
        'Idli': 'idli', 'Jalebi': 'jalebi', 'Kebab': 'kebab', 'Kheer': 'kheer', 'Kulfi': 'kulfi',
        'Lassi': 'lassi', 'MuttonCurry': 'mutton_curry', 'OnionPakoda': 'onion_pakoda',
        'PalakPaneer': 'palak_paneer', 'PoHa': 'poha', 'Poha': 'poha', 'RajmaCurry': 'rajma',
        'RasMalai': 'ras_malai', 'Samosa': 'samosa', 'ShahiPaneer': 'shahi_paneer', 'WhiteRice': 'rice',
    },
}

SPLITS = {'train': 'train', 'valid': 'val', 'test': 'test'}


def main(exports_dir, output_dir):
    names = list(CLASSES)
    index = {name: i for i, name in enumerate(names)}
    counts = {split: 0 for split in SPLITS.values()}
    skipped = {}

    for source, mapping in SOURCE_CLASSES.items():
        for split_dir, split in SPLITS.items():
            ann_path = os.path.join(exports_dir, source, split_dir, '_annotations.coco.json')
            if not os.path.exists(ann_path):
                sys.exit(f'Missing {ann_path}')
            with open(ann_path) as f:
                coco = json.load(f)
            categories = {c['id']: c['name'] for c in coco['categories']}
            boxes_by_image = {}
            for ann in coco['annotations']:
                name = mapping.get(categories[ann['category_id']])
                if name is None:
                    skipped[categories[ann['category_id']]] = skipped.get(categories[ann['category_id']], 0) + 1
                    continue
                boxes_by_image.setdefault(ann['image_id'], []).append((index[name], ann['bbox']))

            image_out = os.path.join(output_dir, 'images', split)
            label_out = os.path.join(output_dir, 'labels', split)
            os.makedirs(image_out, exist_ok=True)
            os.makedirs(label_out, exist_ok=True)
            for image in coco['images']:
                boxes = boxes_by_image.get(image['id'])
                if not boxes:
                    continue
                stem = f'{source}__{os.path.splitext(image["file_name"])[0]}'
                src = os.path.join(exports_dir, source, split_dir, image['file_name'])
                dst = os.path.join(image_out, stem + os.path.splitext(image['file_name'])[1])
                if not os.path.exists(dst):
                    os.symlink(src, dst)
                w, h = image['width'], image['height']
                with open(os.path.join(label_out, stem + '.txt'), 'w') as f:
                    for cls, (x, y, bw, bh) in boxes:
                        f.write(f'{cls} {(x + bw / 2) / w:.6f} {(y + bh / 2) / h:.6f} {bw / w:.6f} {bh / h:.6f}\n')
                counts[split] += 1

    with open(os.path.join(output_dir, 'dataset.yaml'), 'w') as f:
        f.write(f'path: {os.path.abspath(output_dir)}\ntrain: images/train\nval: images/val\ntest: images/test\n')
        f.write('names:\n' + ''.join(f'  {i}: {name}\n' for i, name in enumerate(names)))

    with open(APP_CLASSES_JSON, 'w') as f:
        json.dump([[name, CLASSES[name]] for name in names], f, separators=(',', ':'))

    print(f'{len(names)} classes; images per split: {counts}')
    if skipped:
        print('Unmapped source categories (dropped):', skipped)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
