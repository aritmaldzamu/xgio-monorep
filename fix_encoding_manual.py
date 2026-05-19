import os

replacements = {
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã±': 'ñ',
    'Ã ': 'Á',
    'Ã‰': 'É',
    'Ã\x8d': 'Í',
    'Ãš': 'Ú',
    'Ã‘': 'Ñ',
    'ðŸš¨': '🚨',
    'âš ï¸ ': '⚠️ ',
    'âš ï¸': '⚠️',
    'BATERÃA': 'BATERÍA',
    'BaterÃa': 'Batería',
    'Ãšltima': 'Última',
    'ÃšLTIMA': 'ÚLTIMA',
    'Ãšltimo': 'Último',
    'ÃšLTIMO': 'ÚLTIMO',
    'BaterÃ­a': 'Batería',
    'ConfiguraciÃ³n': 'Configuración',
    'UbicaciÃ³n': 'Ubicación',
    'InformaciÃ³n': 'Información',
    'NotificaciÃ³n': 'Notificación',
    'SesiÃ³n': 'Sesión',
    'MÃ¡s': 'Más',
    'DÃ­a': 'Día',
    'BastÃ³n': 'Bastón',
    'bastÃ³n': 'bastón',
    'ConexiÃ³n': 'Conexión',
    'conexiÃ³n': 'conexión',
    'AÃ±adir': 'Añadir',
    'ContraseÃ±a': 'Contraseña',
    'diseÃ±o': 'diseño',
    'AÃ±o': 'Año',
    'TamaÃ±o': 'Tamaño',
    'MÃ©trica': 'Métrica',
    'PestaÃ±a': 'Pestaña',
    'pestaÃ±a': 'pestaña',
    'NingÃºn': 'Ningún',
    'ningÃºn': 'ningún',
    'AquÃ­': 'Aquí',
    'aquÃ­': 'aquí',
    'AutomÃ¡ticamente': 'Automáticamente',
    'automÃ¡ticamente': 'automáticamente',
    'ElectrÃ³nico': 'Electrónico',
    'Ãšltimos': 'Últimos',
    'Ãšltimas': 'Últimas',
    'continÃºa': 'continúa',
    'envÃ­o': 'envío',
    'EnvÃ­o': 'Envío',
    'telÃ©fono': 'teléfono',
    'TelÃ©fono': 'Teléfono',
    'fÃ­sico': 'físico',
    'FÃ­sico': 'Físico',
    'grÃ¡ficas': 'gráficas',
    'GrÃ¡ficas': 'Gráficas'
}

def fix_manually(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for bad, good in replacements.items():
        new_content = new_content.replace(bad, good)
        
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed manually: {file_path}")

def scan_and_fix(directory):
    if not os.path.exists(directory):
        return
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in root:
            continue
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js') or file.endswith('.css') or file.endswith('.html'):
                fix_manually(os.path.join(root, file))

scan_and_fix(r'c:\Users\arith\xgio-monorepo\admin\src')
scan_and_fix(r'c:\Users\arith\xgio-monorepo\app\app')
print("Manual encoding fix complete.")
