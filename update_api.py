import os
import re

directory = 'frontend/src'

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            new_content = re.sub(
                r"\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http://localhost:3001'\}",
                r"https://clinical-database-intelligence.onrender.com",
                content
            )
            
            new_content = re.sub(
                r"process\.env\.NEXT_PUBLIC_API_URL \|\| 'http://localhost:3001'",
                r"'https://clinical-database-intelligence.onrender.com'",
                new_content
            )
            
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
