const https = require('https')
var SSH = require('simple-ssh');
const fs = require('fs');
const { exit } = require('process');
const conf = require('./config');
const minimist = require('minimist');

// --------- prototypes ------------

Object.prototype.getByIndex = function(index) {
    return this[Object.keys(this)[index]];
};

Array.prototype.extend = function (other_array) {
    other_array.forEach(function(v) {this.push(v)}, this);
}

// --------- functions ------------

function sendDORequest(path, method, body, success){

    const request_options = {
        hostname: 'api.digitalocean.com',
        port: 443,
        path: path,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + conf.AUTHORIZATION_TOKEN
        }
    }

    const req = https.request(request_options, res => {

        let data = '';

        console.log('Status Code:', res.statusCode);
    
        res.on('data', (chunk) => {
            data += chunk;
        });
    
        res.on('end', () => {
            var result_object = data;
            if (data && data[0] == '{'){
                result_object = JSON.parse(data);
            }
            // console.log('Body: ', result_object);
            success(result_object);
        });

    })
    
    req.on('error', error => {
        console.error("error: " + error)
    })

    if(body)
        req.write(JSON.stringify(body));

    req.end()

}


function getAllDroplets(){
    return new Promise((resolve)=>{

        var droplets = [];
        var request_uri = `/v2/droplets?tag_name=${conf.DROPLET_TAG}&per_page=100&page=1`;

        getDropletsByPage(request_uri);

        function getDropletsByPage(request_uri){

            sendDORequest(request_uri, 'GET', null, (res)=>{

                droplets.extend(res.droplets);
    
                if(res.links.pages && res.links.pages.next)
                    getDropletsByPage(res.links.pages.next)
                else
                    resolve(droplets);
            })
        }

    })
}



function getRegions(){
    return new Promise((resolve) => {

        var request_uri = '/v2/regions';
        var regions = [];
    
        sendDORequest(request_uri, 'GET', null, (res)=>{

            res.regions.forEach((element)=>{
                if(element.available)
                    regions.push(element);
            })

            resolve(regions);
        })
    })
}




function createDroplet(name){
    return new Promise((resolve, error)=>{

        getRegions().then((regions)=>{
            
            function randomRegion(regions){
                var key = Math.floor(Math.random() * regions.length)
                return regions.getByIndex(key)
            }

            var region = randomRegion(regions);
            var region_slug = region.slug;
            var droplet_size = region.sizes[0];

            console.log(region_slug + ", " + droplet_size)

            body = {
                "name": name,
                "region": region_slug,
                "size": droplet_size,
                "image": conf.DROPLET_IMAGE,
                "ssh_keys": [conf.SSH_KEY_FINGERPRINT],
                "tags": [conf.DROPLET_TAG]
              }

              //console.dir(body)
    
            sendDORequest('/v2/droplets', 'POST', body, (res)=>{
                if (res.status == 202){
                    resolve(res);
                }else{
                    console.error(res)
                    //error(res);
                }
            })

        })

    })
}

function createDroplets(n){
    return new Promise((resolve)=>{
        console.log("Creating droplets...");
        var names = [];
        for (let i = 0; i < n; i++) {
            var name = `sraka-${Math.floor(Math.random() * 1000000)}.com`;
            //console.log(`Name: ${name}`);
            createDroplet(name).then(()=>{console.log("created droplet:" + name);});        //todo check if created  
        }
        console.log("Droplets creation finished!");
        resolve();
    })
}


function waitUntillDropletsReady(){

    return new Promise((resolve)=>{

        console.log("Waiting when all droplets ready....");

        const waitInterval = setInterval(()=>{

            getAllDroplets().then((droplets)=>{

                var number_of_drops = 0;
                var active_count = 0;
                
                for (let i=0 ; i < droplets.length ; i++)
                    number_of_drops += droplets[i].tags.includes(conf.DROPLET_TAG) ? 1 : 0;

                if(number_of_drops == 0 ){
                    console.error("No droplets found!");
                    exit();
                }

                for (let i=0 ; i < droplets.length ; i++){
                    if (droplets[i].tags.includes(conf.DROPLET_TAG))
                        active_count += droplets[i].status == 'active' ? 1 : 0;
                }

                console.log("Droplets ready: " + active_count + "/" + number_of_drops);

                if (active_count >= number_of_drops){
                    clearInterval(waitInterval);
                    console.log("All droplets ready!");
                    resolve(droplets);
                }

            })

        }, 7000);

    })
}


function executeCommand(droplets, command){
    return new Promise((resolve)=>{

        var finished_commands = 1;

        for (let i=0 ; i < droplets.length ; i++){

            if (droplets[i].tags.includes(conf.DROPLET_TAG) && droplets[i].status == 'active'){
            
                var ip_address = droplets[i].networks.v4[1].ip_address;

                console.log(ip_address);
            
                var ssh = new SSH({
                    host: ip_address,
                    user: conf.SSH_USER,
                    key: fs.readFileSync(conf.SSH_KEY, 'utf8'),
                    passphrase: conf.SSH_KEY_PASSPHRASE
                });
                
                ssh.exec(command, {
                    out: function(stdout) {
                        console.log(stdout);
                    },
                    err: function(stderr) {
                        console.log(stderr); 
                    },
                    exit: function(code, stdout, stderr) {

                        console.log(finished_commands + " FINISHED!");
                        
                        if(finished_commands >= droplets.length)
                            resolve();

                        finished_commands++;
                    },
                }).start();
            }

        }
    })
}

function deleteDroplets(){
    console.log("deleting all droplets...");
    return new Promise((resolve)=>{
        sendDORequest(`/v2/droplets?tag_name=${conf.DROPLET_TAG}`, 'DELETE', null, (res)=>{
            console.dir(res);
            resolve(res);
        })
    })
}

function checkIfArgumentIsMissing(argv, args_needed){

    args_needed.forEach((element, index, array) => {

        if (!(element in argv)){
            console.log(`'${element}' argument is missing`);
            exit();
        }
    })
}


// ------ logic --------

console.log("Start...");

var argv = minimist(process.argv.slice(2));

checkIfArgumentIsMissing(argv, ['mode']);

switch(argv.mode){

    case 'all':
        checkIfArgumentIsMissing(argv, ['dropsnum', 'command']);
        createDroplets(argv.dropsnum)
        .then(()=>waitUntillDropletsReady()
        .then((droplets)=>executeCommand(droplets, argv.command)
        .then(()=>deleteDroplets())))
        break;

    case 'create':
        checkIfArgumentIsMissing(argv, ['dropsnum']);
        createDroplets(argv.dropsnum)
        .then(()=>waitUntillDropletsReady())
        break;

    case 'exec':
        checkIfArgumentIsMissing(argv, ['command']);
        waitUntillDropletsReady()
        .then((droplets)=>executeCommand(droplets, argv.command))
        break;

    case "delete":
        deleteDroplets();
        break;
}