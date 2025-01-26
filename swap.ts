import { parseUnits } from 'viem'
import dayjs from 'dayjs'

export async function getTronWebProvider() {
    const { default: TronWeb } = await import('tronweb')
    return new TronWeb({
        fullHost: 'https://api.trongrid.io'
    })
}


function compressPath(path: string[]) {
    const versions: string[] = []
    const lengths: number[] = []

    let i = 0
    while (i < path.length) {
        const currentVersion = path[i]
        versions.push(currentVersion)

        let count = i === 0 ? 2 : 1
        while (i + 1 < path.length && path[i] === path[i + 1]) {
            count++
            i++
        }

        lengths.push(count)
        i++
    }

    return {
        versions,
        lengths
    }
}

const mockRoute = {
    "amountIn": "10.000000",
    "amountOut": "2.202228088434761649",
    "inUsd": "2.508832491264078320000000",
    "outUsd": "2.516774163999982132721259301315867854",
    "impact": "-0.000193",
    "fee": "0.033988",
    "tokens": [
        "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb",
        "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR",
        "TUpMhErZL2fhh4sVNULAbNKLokS4GjC1F4",
        "TMwFHYXLJaRUPeW6421aqXL4ZEzPRFGkGT"
    ],
    "symbols": [
        "TRX",
        "WTRX",
        "TUSD",
        "USDJ"
    ],
    "poolFees": [
        "0",
        "0",
        "0",
        "0"
    ],
    "poolVersions": [
        "v2",
        "v2",
        "usdj2pooltusdusdt"
    ],
    "stepAmountsOut": [
        "10.000000",
        "2.520523588745956489",
        "2.202228088434761649"
    ]
}

export async function sunSwapExactInput(
    originRoute: any,
    toAddress: string,
    fromDecimals: number,
    toDecimals: number,
    owner: string,
    callValue: number
) {
    const tronWeb = await getTronWebProvider()
    tronWeb.setAddress(owner)

    try {
        const { versions, lengths } = compressPath(originRoute.poolVersions)

        const addressToHex = (address: string) => {
            try {
                if (!address) return ''
                return tronWeb.address.toHex(address).replace(/^41/, '0x')
            } catch (error) {
                console.error('Error converting address to hex:', error)
                return ''
            }
        }

        const args = [
            originRoute.tokens.map(addressToHex),
            versions,
            lengths.map(String),
            originRoute.poolFees.map(String),
            [
                parseUnits(originRoute.amountIn, fromDecimals).toString(),
                parseUnits(
                    String(Number(originRoute.amountOut) / 2),
                    toDecimals
                ).toString(),
                addressToHex(toAddress),
                dayjs().add(600, 'second').unix().toString()
            ]
        ]

        console.log('args' ,JSON.stringify(args, null,2));
        

        const abi = {
            inputs: [
                { type: 'address[]', name: 'path' },
                { type: 'string[]', name: 'poolVersion' },
                { type: 'uint256[]', name: 'versionLen' },
                { type: 'uint24[]', name: 'fees' },
                {
                    components: [
                        { type: 'uint256', name: 'amountIn' },
                        { type: 'uint256', name: 'amountOutMin' },
                        { type: 'address', name: 'to' },
                        { type: 'uint256', name: 'deadline' }
                    ],
                    type: 'tuple',
                    name: 'data'
                }
            ],
            name: 'swapExactInput',
            type: 'function'
        }

        const parameter = tronWeb.utils.abi.encodeParamsV2ByABI(abi, args)

        console.log('parameter' ,parameter);
        
        const functionSelector =
            'swapExactInput(address[],string[],uint256[],uint24[],(uint256,uint256,address,uint256))'
        const res = await tronWeb.transactionBuilder.triggerSmartContract(
            'TCFNp179Lg46D16zKoumd4Poa2WFFdtqYj',
            functionSelector,
            {
                feeLimit: 150000000,
                callValue: tronWeb.toSun(callValue),
                rawParameter: parameter
            },
            [],
            owner
        )

        console.log('res' ,JSON.stringify(res, null,2));
        return res
    } catch (error) {
        console.error('Error in sunSwapExactInput:', error)
        return undefined
    }
}


const owner_address = ''
const from_decimals = 6
const to_decimal =  18
const call_value = 10

sunSwapExactInput(mockRoute,owner_address,from_decimals,to_decimal,owner_address,call_value)