// ByteRent testnet deployment manifest — frontend side.
// Mirrors `deployment/testnet.toml`. Kept in sync manually for now; a
// future refinement could generate this from the TOML at build time.

export const BYTERENT_TESTNET_MANIFEST = {
  network: {
    chain: 'ckb_testnet' as const,
  },
  scripts: {
    listingType: {
      codeHash: '0xdf442d1d6ec1d08cb8174225a385b74bc0125f494ff9041a4ce76370c0fce7de' as const,
      hashType: 'data2' as const,
      txHash: '0x247e78e10a662f9a208668a37b08fbc401d0b400a7c31449b6ce86d45287e790' as const,
      index: 0,
      depType: 'code' as const,
    },
    leaseType: {
      codeHash: '0xd4fd04cd2e3acbbc60e6de7909aaccc9e8ba243839c51feacf3125de6b79156e' as const,
      hashType: 'data2' as const,
      txHash: '0x247e78e10a662f9a208668a37b08fbc401d0b400a7c31449b6ce86d45287e790' as const,
      index: 1,
      depType: 'code' as const,
    },
    leasedCapacityLock: {
      codeHash: '0xa59d70235972aae3903781f7d23d1e4f717723c3757f8f436c10c63e6a49bb43' as const,
      hashType: 'data2' as const,
      txHash: '0x247e78e10a662f9a208668a37b08fbc401d0b400a7c31449b6ce86d45287e790' as const,
      index: 2,
      depType: 'code' as const,
    },
    leasedCapacityType: {
      codeHash: '0x6825b6021dba7ac12eaf5e1d3225e6f38f3d171d59f8e8791c8affad19b883e0' as const,
      hashType: 'data2' as const,
      txHash: '0x247e78e10a662f9a208668a37b08fbc401d0b400a7c31449b6ce86d45287e790' as const,
      index: 3,
      depType: 'code' as const,
    },
    marketConfigType: {
      codeHash: '0x3e850bf8f736370e95a95a47f3de2e6ff2ca60b4b1e6400a19a13673afbb2014' as const,
      hashType: 'data2' as const,
      txHash: '0x247e78e10a662f9a208668a37b08fbc401d0b400a7c31449b6ce86d45287e790' as const,
      index: 4,
      depType: 'code' as const,
    },
  },
  marketConfig: {
    outPoint: {
      txHash: '0xc3ae092d7e4185452653b32d04ca0e35c1ade2a9bd26b2e010cde50f30399272' as const,
      index: 0,
    },
  },
  // Block number at which all ByteRent scripts were deployed (tx
  // 0x247e...e790 was committed here). Light-client sync registers
  // scripts starting from this block — everything relevant to the dApp
  // lives at or after it, so sync time is measured in minutes, not
  // hours, on a cold start.
  deploymentBlockNumber: 20_820_882,
} as const;
