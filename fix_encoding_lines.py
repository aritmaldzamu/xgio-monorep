import os

manual_replacements = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ', 'Ã ': 'Á', 'Ã‰': 'É', 'Ã\x8d': 'Í', 'Ãš': 'Ú', 'Ã‘': 'Ñ',
    'ðŸš¨': '🚨', 'âš ï¸ ': '⚠️ ', 'âš ï¸': '⚠️',
    'Â·': '·', 'Â¿': '¿',
    'ðŸŸ¢': '🟢', 'ðŸŸ¡': '🟡', 'ðŸ”´': '🔴'
}

def fix_line(line):
    # Try the smart decode first
    try:
        smart = line.encode('windows-1252').decode('utf-8')
        if smart != line:
            return smart
    except:
        pass
    
    # Fallback to manual
    new_line = line
    for bad, good in manual_replacements.items():
        new_line = new_line.replace(bad, good)
    return new_line

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    changed = False
    new_lines = []
    for line in lines:
        fixed = fix_line(line)
        if fixed != line:
            changed = True
        new_lines.append(fixed)
        
    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"Fixed lines in: {file_path}")

fix_file(r'c:\Users\arith\xgio-monorepo\admin\src\App.jsx')
fix_file(r'c:\Users\arith\xgio-monorepo\app\app\(tabs)\home.jsx')
print("Line by line fix complete.")
