import { Meter } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { ServerInfo } from './serverInfo.js';

export const Interfaces = new Mongo.Collection('interfaces');

Interfaces.allow({
    insert: function(userId, doc){
        // if use id exists, allow insert
        return !!userId;
    },
});

Meteor.methods({
    'add.interface' (interfaceName, interfaceOS, interfaceGroup, interfaceIP, interfaceIPv6, interfacePrivateKey, interfacePublicKey, interfaceDNS, interfaceDNSv6, myId, checkOnline) {
        check(interfaceName, String);
        check(interfaceOS, String);
        check(interfaceGroup, String);
        check(interfaceIP, String);
        check(interfaceIPv6, String);
        check(interfacePrivateKey, String);
        check(interfacePublicKey, String);
        check(interfaceDNS, String);
        check(interfaceDNSv6, String);
        check(myId, String);
        check(checkOnline, Boolean);

        let serverInfo = ServerInfo.findOne({});

        let port = serverInfo.port;

        Interfaces.insert({
            interfaceName: interfaceName,
            interfaceOS: interfaceOS,
            interfaceGroup: interfaceGroup,
            interfaceIP: interfaceIP,
            interfaceIPv6: interfaceIPv6,
            interfacePort: port,
            interfacePrivateKey: interfacePrivateKey,
            interfacePublicKey: interfacePublicKey,
            interfaceDNS: interfaceDNS,
            interfaceDNSv6: interfaceDNSv6,
            checkOnline: checkOnline,
            status: "offline",
            addedOn: new Date(),
            interfaceUserId: myId,
        });
    },
    'edit.interface' (interfaceId, interfaceName, interfaceDevice, interfaceOS, interfaceIP, interfaceIPv6, interfacePrivateKey, interfacePublicKey, interfaceDNS, interfaceDNSv6) {
        check(interfaceId, String);
        check(interfaceName, String);
        check(interfaceDevice, String);
        check(interfaceOS, String);
        check(interfaceIP, String);
        check(interfaceIPv6, String);
        check(interfacePrivateKey, String);
        check(interfacePublicKey, String);
        check(interfaceDNS, String);
        check(interfaceDNSv6, String);

        Interfaces.update({ _id: interfaceId }, {
            set: {
                interfaceName: interfaceName,
                interfaceDevice: interfaceDevice,
                interfaceOS: interfaceOS,
                interfaceIP: interfaceIP,
                interfaceIPv6: interfaceIPv6,
                interfacePrivateKey: interfacePrivateKey,
                interfacePublicKey: interfacePublicKey,
                interfaceDNS: interfaceDNS,
                interfaceDNSv6: interfaceDNSv6,
                updatedOn: new Date(),
            }
        });
    },
    'edit.InterfacePorts' (interfaceId) {
        check(interfaceId, String);

        let serverInfo = ServerInfo.findOne({});

        let port = serverInfo.port;

        // update all interface ports to this value - basically if the Server port is changed.
        return Interfaces.update({ _id: interfaceId }, {
            $set: {
                interfacePort: port,
            }
        }, { multi: true });
    },
    'delete.interface' (interfaceId) {
        check(interfaceId, String);

        if (!this.userId) {
            throw new Meteor.Error("User is not authorized to delete interfaces. Please make sure you are logged in.");
        }

        let interfaceInfo = Interfaces.findOne({ _id: interfaceId });

        let intPubKey = interfaceInfo.interfacePublicKey;
        let intName = interfaceInfo.interfaceName;

        Interfaces.remove({ _id: interfaceId });

        // now remove the interface from the wg interface
        Meteor.call("remove.wgClient", intPubKey, intName, function(err, result) {
            if (err) {
                console.log("Error in method 'remove.wgClient' on server: " + err);
            } else {
                console.log("Attempted to remove interface " + intName + " from server configuration file.");
            }
        });
    },
    "markInt.online" (onlineIds) {
        check(onlineIds, [String]);

        let count = onlineIds.length;
        // first update the interfaces to all be "offline"
        // then we'll re-update those that are online.

        Interfaces.update({}, { 
            $set: {
                status: "offline",
            }
        }, {
            multi: true
        });

        for (i=0; i<count; i++) {
            Interfaces.update({ _id: onlineIds[i] }, {
                $set: {
                    status: "online",
                }
            });
        }
    }
});