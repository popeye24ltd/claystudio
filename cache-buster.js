const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/<script src="app\.js(\?v=\d+)?"><\/script>/g, '<script src="app.js?v=13"></script>');
    content = content.replace(/<link rel="stylesheet" href="styles\.css(\?v=\d+)?">/g, '<link rel="stylesheet" href="styles.css?v=13">');
    fs.writeFileSync(file, content);
}
console.log('Cache busters updated to v=13.');
