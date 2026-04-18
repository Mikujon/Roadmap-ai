import os, re

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    content = re.sub(r'\{ params \}: \{ params: \{ id: string \} \}', '{ params }: { params: Promise<{ id: string }> }', content)
    if content != original:
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            new_lines.append(line)
            if 'Promise<{ id: string }>' in line and line.strip().endswith('{'):
                new_lines.append('  const { id } = await params;')
        content = '\n'.join(new_lines).replace('params.id', 'id')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed: {path}')

for root, dirs, files in os.walk('src/app/api'):
    for file in files:
        if file == 'route.ts':
            fix_file(os.path.join(root, file))
print('Done')
