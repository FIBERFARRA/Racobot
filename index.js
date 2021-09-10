//Incloem les llibreries de discord
const Discord = require('discord.js');
const client = new Discord.Client();
//carreguem les configuracions que hem establert
const config = require('./config.json');
//Carreguem altres llibreries
const fs = require('fs'); // S'encarrega de l'escriptura i lectura de fitxers (en local): https://www.w3schools.com/nodejs/nodejs_filesystem.asp
const fetch = require('node-fetch'); // S'encarrega de fer consultes a les apis: https://www.npmjs.com/package/node-fetch
const { URLSearchParams } = require('url');
const data = require("./tokens.json"); //Ens serveix per a formatejar URL

/* FITXERS
* avisos.json: Conté tots els avisos que s'han enviat (La seva id i la data de modificació
* config.json: Conté les diferents configuracions que requereix el nostre programa.
* tokens.json: Conté tots els tokens i els tokens de refresh de cada persona que l'ha introduit.
*/

/**
 * S'executa al iniciar el programa, és el primer que fa.
 * */
client.once('ready', () => {
    console.log('Ready!');
    comprovarAvisos();
});

/**
 * @desc Elimina el json anterior i escriu el nou dins del fitxer "tokens.json".
 * @param data: Array amb el continut que ha de tenir l'arxiu tokens.json
 * @returns {boolean}
 */
function set_data(data){
    fs.writeFile("./tokens.json", JSON.stringify(data, null, 4), err => {
        if (err!=null) {
            console.log(err)
            return false;
        }
        else return true;
    });
    return true;
}

/**
 * @desc Llegeix lo que hi hagi dins del fitxer passat per parametre i el converteix en un map.
 * @param file: Nom del fitxer a llegir
 * @returns Map amb el contingut del fitxer
 */
function get_data(file){
    let rawdata = fs.readFileSync(file);
    return JSON.parse(rawdata);
}

/**
 * @desc Escriu pel mateix xat que el del missatge de help totes les comandes disponibles
 * @param msg: classe que conté tota la informació del missatge
 */
function help(msg) {
    const exampleEmbed = new Discord.MessageEmbed()
        .setColor('#ca91ff')
        .setTitle('RacoBotHelper')
        .setDescription('Benvinguts al RacoBot v1.0! \nAquest bot preten facilitar la rebuda de avisos per part del racó de la FIB. \n A continuació veureu el tipus de comandes que podeu utilitzar:')
        .addFields(
            {name: config.prefix + ' addToken {Token}', value: 'Permet al bot poder obtenir els teus avisos. El token es pot obtenir a: http://vps-ffc8b217.vps.ovh.net/raco/', inline:true}
        );
    msg.channel.send(exampleEmbed);
}


/**
 * @desc S'encarrega de formatejar i enviar el missatge de cada avís en format embed i després adjuntar els diferents fitxers.
 * @param result: Array que conté tota la informació del avís
 */

function sendMessage(result,token,key) {
    //Formategem el text ja que ve en html i l'hem de passar a format discord
    let text = result.text;
    text = text.replace(/<p>/g,"").replace(/<\/p>/g,"");
    text = text.replace(/<strong>/g,"**").replace(/<\/strong>/g,"**").replace(/<b>/g,"**").replace(/<\/b>/g,"**");
    text = text.replace(/<i>/g,"_").replace(/<\/i>/g,"_");
    text = text.replace(/&#39;/g,"'").replace(/&#34;/g,"\"").replace(/&#64;/g,"@").replace(/&#61;/g,"=");
    text = text.replace(/<a href="/g,"").replace(/<\/a>/g,"").replace(/<a>/g,"");
    text = text.replace(/<br \/>/g,"");

    //DIscord només excepta descripcions de 4096 o menys caràcters, per això, hem de truncar i avisar al usuari que és més llarg (...)
    text = text.substring(0,4090);
    if(text.length===4090) text = text + "\n...";
    //Generem el embed
    const avisEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle(result.titol)
        .setURL('https://raco.fib.upc.edu/avisos/veure.jsp?assig=GRAU-' + result.codi_assig + '&id=' + result.id) //URL que té el racó per als avisos
        .setAuthor('RacóBot - ' +  result.codi_assig, 'https://i.imgur.com/PDShXsn.png') //@todo fer imatge del bot
        .setDescription(text)
        .setTimestamp(result.data_modificacio);

    //Agafem el canal que té el mateix nom que les assignatures
    var channel = client.channels.cache.get(config.assigs[result.codi_assig.toLowerCase()].channel_id);
    //var channel = client.channels.cache.get("733712076631048378");
    //Enviem el missatge embed
    channel.send({embed: avisEmbed}).then(sent => {
        var data=require("./avisos.json");
        data[result.id] = {
            "id_msg": sent.id,
            "data_mod": result.data_modificacio
        }
        fs.writeFileSync("avisos.json", JSON.stringify(data, null, 4));
    }).catch(console.error);

    //Mirem si hi ha fitxers adjunts, en cas que si, els afegim al array.
    for (let key in result.adjunts) {
        if (result.adjunts[key].mida < 8388608) {
            fetch(result.adjunts[key].url, { method: 'GET', headers: {'Accept': 'application/json',
                    'Authorization': 'Bearer ' + encodeURIComponent(token)} })
                .then(res => res.buffer())
                .then(buffer => {
                    let attachment = new Discord.MessageAttachment(buffer,result.adjunts[key].nom);
                    channel.send({files: [attachment]});
                }
            )
        }
    }
}

/**
 * @desc processa cada avís obtingut per a saber si l'ha d'enviar o no compleix els requisits per a ser enviat. Si és vàlid, crida a sendMessage() per a que ho envii per discord.
 * @param json: Ens passa un array que conté totes les dades del json de la api
 */
function procesarAvisos(json,token) {
    //Afegim el fitxer on tenim la llista d'avisos enviats
    var data=require("./avisos.json");
    //Recorrem els diferents avisos
    for (let key in json.results) {
        let id=json.results[key].id;
        //let date1= new Date();
        //date1.setDate(date1.getDate()-1);
        let date2 = new Date(json.results[key].data_modificacio);
        //Comprovem que la data sigui correcte i que no existeixi en els avisos ja enviats.
        if(data[id]==null) {
            for (let k in config.assigs) {
                if(k === json.results[key].codi_assig.toLowerCase()) {
                    //Cridem a enviar missatge
                    sendMessage(json.results[key],token,key);
                    //Afegim el missatge a al json de missatges.
                }
            }
        }
    }
}

/**
 * @desc Realitza un fetch a la api d'avisos del racó i crida al seu processament
 * @param token: Token vàlid per a poder accedir als avisos del usuari.
 */
function getAvisos(token) {
    fetch('https://api.fib.upc.edu/v2/jo/avisos/', { method: 'GET', headers: {'Accept': 'application/json',
            'Authorization': 'Bearer ' + encodeURIComponent(token)} })
        .then(res => res.json())
        .then(json => {
            if(json.detail ==null) {
                procesarAvisos(json,token);
            }else {
                console.log("L'obtenció dels avisos ha fallat");
                console.log(json);
            }
        }
    );
}

/**
 * @desc S'encarrega de refrescar el token del usuari passat per paràmetre i proporcionar el nou token i el nou token de refresh.
 * @param refresh_token: Toquen de refresh el qual ens permet generar un nou token
 * @param id: id del usuari per a poder afegir els nous tokens al mateix usuari
 */
function refreshToken(refresh_token,id) {
    //Claus de l'aplicació
    var client_id = 'fi7GYPofOE3KlcgQW17nqp9ktzBFkz9mLMOaS6eB';
    var client_secret = 'slG2vrxxuRSNsz60j5o3qMTljG9JxOa8oE81Y2lFL0z0teZqZsbItS5IljOrIKawEWIKmzLmvkOGlrYr7y8BCTtYt9mmSerIna96fjyjNaLwYh3BJ8qSoBMyzOVnfh0h';
    //Formategem els paràmetres per a que puguin ser enviats per POST
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token',  encodeURIComponent(refresh_token));
    params.append('client_id',  encodeURIComponent(client_id));
    params.append('client_secret',  encodeURIComponent(client_secret));
    //Fem el fetch per a generar el nou token
    fetch('https://api.fib.upc.edu/v2/o/token', {method: 'POST', body: params})
        .then(res => res.json())
        .then(json => {
            //Si el token es correcte, actualitzem el token del arxiu token.json
            if (json.access_token != null && json.refresh_token != null) {
                console.log("Token actualizado");
                var data = require("./tokens.json");
                data[id] = {
                    token: json.access_token,
                    refresh: json.refresh_token
                }

                getAvisos(json.access_token);
                if (!set_data(data)) {
                    console.log("El token no se ha podido actualizar en el fichero");
                }
            } else console.log("No se ha podido refrescar el token");
        });
}

/**
 * @desc Realitza un bucle per a cridar tots els tokens i, refrescar el token de cada persona i comprovar els seus avisos que no n'hi hagi de nous.
 */
function comprovarAvisos() {

    var data = get_data("tokens.json");
    Object.keys(data).forEach(function(key) {
        let id = key;
        let refresh_token = data[key].refresh;
        refreshToken(refresh_token,id);
    })
}

/**
 * Quan algun usuari executa la comanda d'afegir un token, es crida aquesta funció, la qual s'encarrega d'adjuntar el nou token, extret de la pàgina web. Aquest és guardat a tokens.json
 * @param message: classe que conté tota la informació del missatge
 */
function addToken(message) {

    var msg = message.content.split(" ");
    //Comprovem que els paràmetres son correctes
    if (msg.length!==3) message.channel.send("Parametros incorrectos. Para usar este comando: " +config.prefix+" addToken {token}");
    else {
        var token = msg[2];
        var data = require("./tokens.json");
        data[message.author.id] = {
            token: "",
            refresh: token
        }
        if(set_data(data)){
            message.channel.send("El token ha sido registrado exitosamente. Tus asignaturas seran mostradas proximamente");
            message.delete();
        }
        else{
            message.channel.send("Ha habido un error registrando el token. Por favor, vuelve a intentarlo. En caso de error, contacta con Alex.");
        }
    }

}

/**
 * Es cridada quan s'envia un missatge al servidor i comprova si coincideix amb el desitjat
 */
client.on('message', message => {
    if (message.content === config.prefix +" help") help(message);
    else if (message.content.startsWith(config.prefix + " addToken")) addToken(message);
});

/**
 * Cada delay segons ens crida la funcio comprovarAvisos
 */
client.setInterval(function() {
    comprovarAvisos();
    console.log("Los avisos han sido actualizados correctamente");
}, 600000); // 10 minutos


//Ens permet poder accedir al servidor
client.login(config.token);