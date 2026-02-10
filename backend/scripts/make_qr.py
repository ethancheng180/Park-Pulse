import qrcode
import sys
import os

def generate_qr(data, output_path):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img.save(output_path)
    print(f"QR code saved to {output_path}")

if __name__ == "__main__":
    # Expo URL from logs
    expo_url = "exp://192.168.1.192:8081"
    
    # Save to artifacts directory for easy viewing
    # Using the scratch directory for now to simplify
    output_file = "mobile_qr.png"
    
    generate_qr(expo_url, output_file)
