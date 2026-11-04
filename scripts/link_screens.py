import re
import os

files = ['index.html', 'gym.html', 'academy.html', 'lab.html']

for filename in files:
    filepath = os.path.join('frontend', 'public', filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    # Replace href on Terminal
    html = re.sub(
        r'<a([^>]*?)href="[^"]*"([^>]*?)>\s*(<span[^>]*>candlestick_chart</span>\s*<span>Terminal</span>)',
        r'<a\1href="index.html"\2>\n\3',
        html
    )
    # Replace href on Blind Replay Gym
    html = re.sub(
        r'<a([^>]*?)href="[^"]*"([^>]*?)>\s*(<div[^>]*>\s*<span[^>]*>replay</span>\s*<span>Blind Replay Gym</span>)',
        r'<a\1href="gym.html"\2>\n\3',
        html
    )
    # Replace href on Academy
    html = re.sub(
        r'<a([^>]*?)href="[^"]*"([^>]*?)>\s*(<span[^>]*>school</span>\s*<span>Academy</span>)',
        r'<a\1href="academy.html"\2>\n\3',
        html
    )
    # Replace href on Strategy Lab
    html = re.sub(
        r'<a([^>]*?)href="[^"]*"([^>]*?)>\s*(<span[^>]*>science</span>\s*<span>Strategy Lab</span>)',
        r'<a\1href="lab.html"\2>\n\3',
        html
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Updated navigation links in {filename}")
