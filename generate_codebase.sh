#!/bin/bash

# Array of files to be read and appended
FILES=(
  "server.js"
  "controllers/User.js"
  "middlewares/db.connection.js"
  "middlewares/global.js"
  "models/User.js"
  ".env"
  "package.json"
  "README.md"
)

# Output file where all contents will be appended
OUTPUT_FILE="codebase.txt"

# Empty the output file before starting
> "$OUTPUT_FILE"

# Loop through each file in the array
for FILE in "${FILES[@]}"; do
  # Check if the file exists
  if [[ -f "$FILE" ]]; then
    # Append an empty line to the output file
    echo "" >> "$OUTPUT_FILE"
    
    # Append the path of the current file to the output file
    echo "$FILE" >> "$OUTPUT_FILE"
    
    # Append the contents of the current file to the output file
    cat "$FILE" >> "$OUTPUT_FILE"
  else
    echo "File $FILE does not exist."
  fi
done

echo "All files have been processed and appended to $OUTPUT_FILE."
