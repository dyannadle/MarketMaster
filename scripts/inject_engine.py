import os

files = ['index.html', 'gym.html', 'academy.html', 'lab.html']
for fname in files:
    path = os.path.join('frontend', 'public', fname)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'terminal-engine.js' not in content:
        content = content.replace('</body>', '<script src="terminal-engine.js"></script>\n</body>')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Injected into {fname}")
    else:
        print(f"Already injected into {fname}")

