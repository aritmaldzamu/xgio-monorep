import os

def fix_mojibake(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    try:
        # Tries to reverse the UTF-8 interpreted as Windows-1252 mojibake
        fixed_content = content.encode('windows-1252').decode('utf-8')
        if fixed_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print(f"Fixed: {file_path}")
    except Exception as e:
        # If it fails to encode/decode, it might not be purely mojibaked or contains mixed characters.
        pass

def scan_and_fix(directory):
    if not os.path.exists(directory):
        return
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js'):
                fix_mojibake(os.path.join(root, file))

scan_and_fix(r'c:\Users\arith\xgio-monorepo\admin\src')
scan_and_fix(r'c:\Users\arith\xgio-monorepo\app')
print("Encoding fix complete.")
