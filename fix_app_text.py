from pathlib import Path

p = Path.cwd() / 'app.js'
text = p.read_text(encoding='utf-8', errors='ignore')

replacements = {
    'Â¡': '¡',
    'Â¿': '¿',
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã±': 'ñ',
    'Ã¼': 'ü',
    'Â°': '°',
    'â€”': '—',
    'â€“': '–',
    'â€œ': '“',
    'â€': '”',
    'â€˜': '‘',
    'â€™': '’',
    'â€¦': '…',
    'No hay conexion': 'No hay conexión',
    'No hay fotÃ³grafos disponibles aÃºn.': 'No hay fotógrafos disponibles aún.',
    'No tienes mensajes aÃºn.': 'No tienes mensajes aún.',
    'Ver conversaciÃ³n': 'Ver conversación',
    'Marcar como leÃdo': 'Marcar como leído',
    'ExcepciÃ³n': 'Excepción',
    'sesiÃ³n': 'sesión',
    'fotografos': 'fotógrafos',
    'fotografo': 'fotógrafo',
    'fotografÃa': 'fotografía',
    'galeri­a': 'galería',
    'exportacion': 'exportación',
    'increÃble': 'increíble',
    'comunÃcate': 'comunícate',
    'instantÃ¡neamente': 'instantáneamente',
    'lÃnea': 'línea',
    'ConexiÃ³n': 'Conexión',
    'Bandeja de Mensajes': 'Bandeja de mensajes',
    'Por aquÃ': 'Por aquí',
    'fotÃ³grafo': 'fotógrafo',
    'FotÃ³grafo': 'Fotógrafo',
    'aÃºn': 'aún',
    'dÃa': 'día',
    'dÃas': 'días',
    'cita el dÃa': 'cita el día',
    'pestaÃ±a': 'pestaña',
}
for old, new in replacements.items():
    text = text.replace(old, new)

text = text.replace('No hay conectiÃ³n', 'No hay conexión')
text = text.replace('Agencia de fotografÃ­a', 'Agencia de fotografía')
text = text.replace('GalerÃ­a', 'Galería')
text = text.replace('MensajerÃ­a', 'Mensajería')
text = text.replace('ComunÃ­cate', 'Comunícate')
text = text.replace('En lÃ­nea', 'En línea')
text = text.replace('Â¡', '¡').replace('Â¿', '¿')

p.write_text(text, encoding='utf-8')
print('Repaired', p)
