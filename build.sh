#!/usr/bin/env sh

# abort on errors
set -e

# build
# npm run build


# navigate into the build output directory
cd docs

# cp ../google6da897d4a0468b40.html ./google6da897d4a0468b40.html
cp ../robot.txt ./robot.txt
cp ../ads.txt ./ads.txt
touch .nojekyll

# if you are deploying to a custom domain
# echo 'www.example.com' > CNAME
# git config user.name "jewelism"
# git config user.email "boseokjung@gmail.com"


# git init
# git add -A
# git commit -m 'deploy'


# # if you are deploying to https://<USERNAME>.github.io

# git push -f git@github.com:jewelism/jewelism.github.io.git +main
# # if you are deploying to https://<USERNAME>.github.io/<REPO>
# # git push -f git@github.com:<USERNAME>/<REPO>.git master:gh-pages

cd -