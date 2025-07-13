function cl(str){
    console.log('mnode',str);
}


module.exports = function(RED) {
    function mInstance(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var sws = require("mnodehttp/serverWs");
        //console.log("mInstance created");
        this.server = RED.nodes.getNode(config.server);
        //console.log("got config ....");
        var nconf = this.server;
        var sc0 = undefined;
        var thisConfigIsOk = undefined;
        var errConfId = '';
        //console.log(nconf);
        
        cl('----my Conf: '+nconf.id+'---------id: '+this.id+'------------name: '+this.name);
        setTimeout(()=>{
            cl("\n\n---------------\n\n");

            cl("status of config check: "+thisConfigIsOk);
            if( thisConfigIsOk == undefined ){

                thisConfigIsOk = true;
                mkServer();
            }else if( thisConfigIsOk == false ){
                mkError("Config is used by: "+errConfId);
            }

        },500);

        RED.nodes.eachNode( ( nod )=>{
            if( nod.type== 'mnodehttp-instance' && nod.id != node.id ){
                if( nod.server == nconf.id ){
                    errConfId = nod.id;
                    cl("-------- different node use sema config !!");
                    cl( nod );
                    thisConfigIsOk = false;
                }
            }          
            
        } );


        function wsCallBack( ws, isFrom, msg = undefined ){
            //console.log(`wsCallBack got is from [${isFrom}] msg...`,msg);
            bufStr = '';
            if( msg != undefined ){
                bufStr = msg.toString();
                /*
                if( bufStr.substring(0,3) == 'SM:' ){
                    node.send( {" topic":"SM", "payload":bufStr.substring(3) } );
                
                }else if( bufStr.substring(0,8) == 'SMToAll:' ){
                    let pay = bufStr.substring(8);
                    node.send({ "topic":"SMToAll","payload":pay });

                }else */
                if( bufStr.substring(0,10) == 'toMqttPub:' ){
                    let o = bufStr.substring(10).split(',');
                    let nMsg = {};
                    for( let p=0,pc=o.length; p<pc; p++ ){
                        let t = o[p].split('=');
                        nMsg[ t[0] ] = t[1];
                    }
                    nMsg['target'] = 'mqtt';
                    node.send( nMsg );
                    

                }else{
                    node.send( {'topic':'mnodehttp/msg', 'isFrom': isFrom, 'payload': bufStr } );
                }

            }else{
                node.send( {'topic':'mnodehttp/'+isFrom, 'isFrom': isFrom } );
            }
        }

        function mkError(str){
            node.status({'text':str, fill:"red"});
        }

        function mkServer(){
            if( nconf.host ){
                node.status({'text':'running ...', fill:"green"});
                var serCon = require('mnodehttp/serverContainer');
                var path = require("path");
                var nyss = require('node-yss');
                var nysspath = nyss.telMeYourHome(`node-red-contrib-mnodehttp ${nconf.iname}`);
                var config0 = {
                    'name': nconf.iname,
                    'HOST': nconf.host,
                    'PORT': nconf.port,
                    'wsHOST': nconf.wshost,
                    'wsPORT': nconf.wsport,
                    'pathToYss': nconf.pathtoyss == ''? path.join( nysspath ,"yss" ) : nconf.pathtoyss,//'/home/yoyo/Apps/oiyshTerminal/ySS_calibration',
                    'pathsToSites': nconf.pathstosites == '' ? [ path.join( nysspath, 'yss', 'sites' ) ] : nconf.pathstosites.split(','),    
                    'wsInjection': false,
                    'wsInjection': true,
                    'yssWSUrl': nconf.ysswsurl,
                    
                    'sitesInjection': true,
                    'ws': undefined,
                    'wsPinger': true
                };
                
                sc0 = new serCon.serverContainer(0, config0, wsCallBack );
                sc0.initServers();
                //cl(`starting [${nconf.name}]...`);
                sc0.startServer();
                
            }

        }

        node.on('close', function(dane) {
            cl("on close ...");
            sc0.stopServer();
        });

        node.on('input', function(msg) {
            //cl("on input ....");
            sws.sendToAll( sc0.ws, JSON.stringify(msg));
        });
    }
    RED.nodes.registerType("mnodehttp-instance",mInstance);

    function mconfig(n){
        RED.nodes.createNode(this,n);
        //console.log('mconfig ',n);
        this.id = n.id;
        this.iname = n.iname;
        this.host = n.host;
        this.port = n.port;
        this.wshost = n.wshost;
        this.wsport = n.wsport;
        this.pathstosites = n.pathstosites;
        this.pathtoyss = n.pathtoyss;
        this.ysswsurl = n.ysswsurl;

        function getIname(){
            return this.iname;
        }

    }
    RED.nodes.registerType("mnodehttp-config",mconfig);
}