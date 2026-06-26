import os

files_to_update = [
    "db/seed_full_participants.sql",
    "db/seed_data.sql"
]

for file_path in files_to_update:
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    new_lines = []
    for line in lines:
        if '"admin": true' in line:
            if 'EX-01' in line or 'EX-03' in line or 'ADMIN-' in line:
                new_lines.append(line)
            else:
                line = line.replace('"admin": true, ', '')
                line = line.replace('"admin": true', '')
                new_lines.append(line)
        else:
            new_lines.append(line)
            
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
        
print("Successfully updated seed files!")
