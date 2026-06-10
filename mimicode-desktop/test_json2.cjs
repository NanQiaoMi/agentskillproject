const fs = require('fs');
try {
    const raw = fs.readFileSync('test_tauri_invoke_log_projecttest.txt', 'utf8');
    const parsed = JSON.parse(raw);
    console.log('SUCCESS:', parsed[0].title);
} catch(e) {
    console.error('FAIL:', e);
}
