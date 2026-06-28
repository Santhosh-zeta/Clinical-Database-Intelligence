import os
import re

dir_path = "backend/src/db/migrations"
for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith(".sql"):
            path = os.path.join(root, file)
            with open(path, "r") as f:
                content = f.read()
            
            # replace semicolon inside string comments, e.g. '...;...'
            # This regex looks for a semicolon followed by a space inside single quotes, or just a semicolon.
            # actually we can just manually fix the known ones
            new_content = content.replace("';'", "';'") # dummy
            new_content = new_content.replace("interaction database; CHECK", "interaction database, CHECK")
            new_content = new_content.replace("changes; populated", "changes, populated")
            new_content = new_content.replace("generated; populated", "generated, populated")
            new_content = new_content.replace("inbox; populated", "inbox, populated")
            new_content = new_content.replace("scale); populated", "scale), populated")
            new_content = new_content.replace("Unresponsive; updated", "Unresponsive, updated")
            new_content = new_content.replace("admission; populated", "admission, populated")
            new_content = new_content.replace("ward; is_icu", "ward, is_icu")
            new_content = new_content.replace("hypotension; monitor", "hypotension, monitor")
            new_content = new_content.replace("glucose; insulin", "glucose, insulin")

            if new_content != content:
                with open(path, "w") as f:
                    f.write(new_content)
                print("Fixed", path)

