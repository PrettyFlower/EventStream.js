tsc @files
mkdir -p Scripts/JS
rsync -a --include "*/" --include "*.js" --exclude "*" --remove-source-files Scripts/TypeScript/. Scripts/JS