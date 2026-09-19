import os
import sys
import zipfile

def create_zip(output_path, root_dir):
    ignore_dirs = {
        'node_modules',
        'dist',
        'dev-dist',
        '.git',
        '.cache',
        '__pycache__',
        '.idea',
        '.vscode',
        'build',
    }
    ignore_extensions = {'.pyc', '.pyo', '.DS_Store', '.log'}

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for root, dirs, files in os.walk(root_dir):
            # Prune ignored directories in-place
            dirs[:] = [d for d in dirs if d not in ignore_dirs and not d.startswith('.')]
            
            for file in files:
                if any(file.endswith(ext) for ext in ignore_extensions):
                    continue
                file_path = os.path.join(root, file)
                # Avoid zipping the zip itself if it's placed inside root
                if os.path.abspath(file_path) == os.path.abspath(output_path):
                    continue
                rel_path = os.path.relpath(file_path, root_dir)
                try:
                    zipf.write(file_path, arcname=rel_path)
                except Exception as e:
                    print(f"Skipping {file_path}: {e}", file=sys.stderr)

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/fleetops-project.zip'
    root = sys.argv[2] if len(sys.argv) > 2 else '.'
    create_zip(out, root)
    print(f"Created {out} ({os.path.getsize(out)} bytes)")
