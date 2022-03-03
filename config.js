
module.exports = {
    AUTHORIZATION_TOKEN : '451ac295e...',       // your DigitalOcean API token
    SSH_USER :'root',                           // user, which will be used for SSH connection, usually 'root'
    SSH_KEY_FINGERPRINT : 'e1:03:a3:...',       // SSH key fingerprint
    SSH_KEY : '/path/id_rsa',                   // path to your SSH private key
    SSH_KEY_PASSPHRASE : 'yu0rPassw0rd',        // passphrase to your SSH private key
    DROPLET_TAG : "russ_ship_nah",              // droplet tag which is used to distinguish droplets for this scripts among all others
    DROPLET_IMAGE : "docker-20-04",             // image used to create a droplet
}