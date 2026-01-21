import pandas as pd
import qrcode
import os
from PIL import Image

# Constants
IDS_CSV = 'Unified_IDs.csv'
OUTPUT_DIR = 'output/qrcodes'

def main():
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Read IDs
    try:
        df = pd.read_csv(IDS_CSV)
    except Exception as e:
        print(f"Error reading {IDS_CSV}: {e}")
        return

    # Check for 'IDs' column, adjust if simple list
    col_name = 'IDs'
    if col_name not in df.columns:
        if 'ID' in df.columns:
            col_name = 'ID'
        else:
             print(f"Error: '{col_name}' column not found in {IDS_CSV}")
             return

    print(f"Found {len(df)} IDs. Generating transparent QR codes (Fill: #195F8C)...")

    for idx, row in df.iterrows():
        id_str = str(row[col_name]).strip()
        filename = f"{id_str}.png"
        save_path = os.path.join(OUTPUT_DIR, filename)
        
        # 1. Generate standard QR code (Black/White)
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=20,
            border=0,
        )
        qr.add_data(id_str)
        qr.make(fit=True)
        
        # Generate as standard BW first to ensure clean lines
        img = qr.make_image(fill_color="black", back_color="white")
        
        # 2. Convert to RGBA for transparency
        img = img.convert("RGBA")
        
        # 3. Pixel substitution for exact color control
        datas = img.getdata()
        new_data = []
        
        # Desired Color: #195F8C -> (25, 95, 140)
        fill_color = (25, 95, 140, 255)
        transparent = (255, 255, 255, 0)
        
        for item in datas:
            # item is (R, G, B, A)
            # If the pixel is white (background), make it transparent.
            if item[0] > 200 and item[1] > 200 and item[2] > 200:
                new_data.append(transparent)
            else:
                new_data.append(fill_color)
        
        img.putdata(new_data)
        
        img.save(save_path, "PNG")
        
        if (idx + 1) % 10 == 0:
            print(f"Generated {idx + 1}/{len(df)} QR codes...", flush=True)

    print("QR code generation complete.")

if __name__ == '__main__':
    main()
