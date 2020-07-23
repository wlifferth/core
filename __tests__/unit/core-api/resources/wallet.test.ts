import "jest-extended";

import { WalletResource } from "@packages/core-api/src/resources";
import { Application, Contracts } from "@packages/core-kernel";
import { Identifiers } from "@packages/core-kernel/src/ioc";
import { Transactions as MagistrateTransactions } from "@packages/core-magistrate-crypto";
import passphrases from "@packages/core-test-framework/src/internal/passphrases.json";
import { TransactionHandlerRegistry } from "@packages/core-transactions/src/handlers/handler-registry";
import { Identities, Transactions, Utils } from "@packages/crypto";

import { buildSenderWallet, initApp, parseObjectWithBigInt } from "../__support__";

let app: Application;
let resource: WalletResource;

beforeEach(() => {
    app = initApp();
    app.bind(Identifiers.TransactionHistoryService).toConstantValue(null);

    // Triggers registration of indexes
    app.get<TransactionHandlerRegistry>(Identifiers.TransactionHandlerRegistry);
    resource = new WalletResource();
});

afterEach(() => {
    try {
        Transactions.TransactionRegistry.deregisterTransactionType(
            MagistrateTransactions.BusinessRegistrationTransaction,
        );
        Transactions.TransactionRegistry.deregisterTransactionType(
            MagistrateTransactions.BridgechainRegistrationTransaction,
        );
    } catch {}
});

describe("WalletResource", () => {
    let senderWallet: Contracts.State.Wallet;

    beforeEach(() => {
        senderWallet = buildSenderWallet(app);
    });

    describe("raw", () => {
        it("should return raw object", async () => {
            expect(resource.raw(senderWallet)).toEqual(senderWallet);
        });
    });

    describe("transform", () => {
        let expectedResult: any;

        beforeEach(() => {
            expectedResult = expectedResult = {
                publicKey: Identities.PublicKey.fromPassphrase(passphrases[0]),
                address: Identities.Address.fromPassphrase(passphrases[0]),
                nonce: "0",
                balance: "7527654310",
                attributes: {},
            };
        });

        it("should return transformed object", async () => {
            expect(resource.transform(senderWallet)).toEqual(expect.objectContaining(expectedResult));
        });

        it("should return transformed object when contains additional attributes", async () => {
            senderWallet.setAttribute("htlc.lockedBalance", Utils.BigNumber.make(100));
            senderWallet.setAttribute("delegate.username", "Dummy");
            senderWallet.setAttribute("delegate.resigned", true);
            senderWallet.setAttribute("vote", Identities.PublicKey.fromPassphrase(passphrases[1]));
            senderWallet.setAttribute("multiSignature", "dummy multiSignature");
            senderWallet.setAttribute("secondPublicKey", Identities.PublicKey.fromPassphrase(passphrases[2]));

            expectedResult.attributes = {
                htlc: {
                    lockedBalance: "100",
                },
                delegate: {
                    username: "Dummy",
                    resigned: true,
                },
                vote: Identities.PublicKey.fromPassphrase(passphrases[1]),
                multiSignature: "dummy multiSignature",
                secondPublicKey: Identities.PublicKey.fromPassphrase(passphrases[2]),
            };

            const result = parseObjectWithBigInt(resource.transform(senderWallet));

            expect(result).toEqual(expect.objectContaining(expectedResult));
        });
    });
});
