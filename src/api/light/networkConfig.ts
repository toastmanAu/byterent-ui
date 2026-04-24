// CKB testnet network config for @nervosnetwork/ckb-light-client-js.
// Lifted verbatim from the library's README (the bootnodes are the
// canonical CKB testnet bootstrap peers).
//
// This is a runtime config for the light client itself — completely
// separate from byterent's deployment manifest. We inline it so the
// client starts without an extra HTTP round-trip for a TOML fetch.

export const CKB_TESTNET_CONFIG = `chain = "testnet"

[store]
path = "data/store"

[network]
path = "data/network"

listen_addresses = ["/ip4/0.0.0.0/tcp/8110"]

bootnodes = [
    "/dns4/dagon.ckb.guide/tcp/443/wss/p2p/QmX5D6aJiAQ5Fxn4BfVqSn6zrgyuQM1oXVC9yvmzLuHXnx",
    "/dns4/javelin.ckb.guide/tcp/443/wss/p2p/QmPcJY2gZLUm66szYA9QaG1P3rzwseWCMgbj6AyNCyW4G2",
    "/dns4/diadem.ckb.guide/tcp/443/wss/p2p/QmQMjFrNGaphzfHin3mbYybbJcFMDUihKAcknquYvm9J3W",
    "/dns4/bloodstone.ckb.guide/tcp/443/wss/p2p/QmQoTR39rBkpZVgLApDGDoFnJ2YDBS9hYeiib1Z6aoAdEf",
    "/dns4/crown.ckb.guide/tcp/443/wss/p2p/QmTt6HeNakL8Fpmevrhdna7J4NzEMf9pLchf1CXtmtSrwb",
    "/dns4/mekansm.ckb.guide/tcp/443/wss/p2p/QmT6DFfm18wtbJz3y4aPNn3ac86N4d4p4xtfQRRPf73frC",
    "/dns4/circlet.ckb.guide/tcp/443/wss/p2p/Qmd41MaByDprkC5gP1XBKgamZ9DTLNk37zbPgwtiWCzRV6",
    "/dns4/vanguard.ckb.guide/tcp/443/wss/p2p/QmWVuW5KquiWDSqgMJRFW1xRtVqkYJrWz6S9NNk6fFn3wh",
    "/dns4/chainmail.ckb.guide/tcp/443/wss/p2p/QmfUTZxsse7rFJTJfoUv8bbStoDLETxst5nJEpJozNuAnH",
    "/dns4/gleipnir.ckb.guide/tcp/443/wss/p2p/QmSPkAyXqsWpRiS7HpHLTProVdhQWLKFHCXbRjaLpJj7ZL",
    "/dns4/parasma.ckb.guide/tcp/443/wss/p2p/QmSJTsMsMGBjzv1oBNwQU36VhQRxc2WQpFoRu1ZifYKrjZ",
    "/dns4/bottle.ckb.guide/tcp/443/wss/p2p/QmWcEhsMNRcfJit62EbKgzpgtAJZX1G3Ur4shXjcvLsYDb"
]

# The upstream README warns: a light client must connect at least
# max_outbound_peers / 2 nodes before sync begins, and hitting too many
# stalls sync (quantum-purse issue #68). 4 is the upstream default.
max_peers = 125
max_outbound_peers = 4
ping_interval_secs = 120
ping_timeout_secs = 1200
connect_outbound_interval_secs = 15
upnp = false
discovery_local_address = false
bootnode_mode = false
`;
