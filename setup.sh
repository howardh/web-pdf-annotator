#!/bin/bash

# adduser {username}
# usermod -aG sudo {username}
# su - {username}

sudo apt -y update
pwd=$(sed 's:/:\\/:g' <<< $(pwd)) 
username=$(whoami) 

# Database
sudo apt -y install postgresql postgresql-contrib
sudo -u postgres createuser -PE -s $username # Requires user input for password
sudo -u postgres createdb $username

# Flask Service
sudo apt -y install python3-pip python3-dev build-essential libssl-dev libffi-dev python3-setuptools python3-virtualenv python3-flask libpcre3-dev
cd backend
virtualenv ENV
cat requirements.txt | xargs -n 1 ./ENV/bin/pip install
./ENV/bin/pip install psycopg2-binary
./ENV/bin/pip install uwsgi
cd ..

sed -e "s/{user}/$username/g" -e "s/{workingdirectory}/$pwd/g" "s/{path}/$PATH/g" ./configs/annotator.service | sudo tee /etc/systemd/system/annotator.service

sudo systemctl start annotator
sudo systemctl enable annotator

# Front End
sudo apt -y install npm
cd web
npm install
npm run build

cd ..

# Nginx

sudo apt -y install nginx

sed -e "s/{workingdirectory}/$pwd/g" ./configs/site | sudo tee /etc/nginx/sites-available/annotator
sudo ln -s /etc/nginx/sites-available/annotator /etc/nginx/sites-enabled
sudo rm /etc/nginx/sites-enabled/default

sudo systemctl restart nginx

# Misc

sudo apt install poppler-utils
