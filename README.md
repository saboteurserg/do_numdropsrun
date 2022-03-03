Intro
----
This script 
- creates droplets in DigitalOcean from the image with preinstalled docker (or any other which you specify)
- waits when all droplets are ready
- runs lunux command on each droplet after all droplets are ready
- deletes all droplets

All these steps can be done with one command, or if you prefer you can done each of them separately


Installation
----
* install nodejs
* install nodejs modules:
 
- `npm install https`
- `npm install simple-ssh`
- `npm install fs`
- `npm install process`
- `npm install minimist`


Setup
----
Configure following variables which are in the config.js file:

```javascript
    AUTHORIZATION_TOKEN : '451ac295e5.....',       // your DigitalOcean API token
    SSH_USER :'root',                              // user, which will be used for SSH connection, usually 'root'
    SSH_KEY_FINGERPRINT : 'e1:03:a3:a9.....',      // SSH key fingerprint
    SSH_KEY : '/path/id_rsa',                      // path to your SSH private key
    SSH_KEY_PASSPHRASE : 'y0urPassw0rd',           // passphrase to your SSH private key
    DROPLET_TAG : "russ_ship_nah",                 // droplet tag which is used to distinguish droplets for this scripts among all others
    DROPLET_IMAGE : "docker-20-04",                // image used to create a droplet
```


Parameters:
---

* ***mode***: - what to do

possible values:
- *all* (params: dropsnum, command) - runs eveything: creates droplets, waits when all are active, runs command on each droplet, when all finished -  deletes all droplets
- *create* - (params: dropsnum) - creates droplets and waits when all of them are ready
- *exec* - (params: command) - runs alpine/bombardier command
- *delete* - (no params) - deletes all droplets

* ***dropsnum*** - number of droplets to create
* ***command*** - linux command to execute


Examples how to run with parameters:
---
- `node index.js --mode all --dropsnum 3 --command "docker run --rm alpine/bombardier -c 1500 -d 3600s -l https://example.com"`
- `node index.js --mode create --dropsnum 10`
- `node index.js --mode exec --command "docker run --rm alpine/bombardier -c 10 -d 10s -l http://example.com"`
- `node index.js --mode delete`