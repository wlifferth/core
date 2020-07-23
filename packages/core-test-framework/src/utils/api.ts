import "jest-extended";

import { Identifiers } from "@arkecosystem/core-api";
import { Contracts, Utils } from "@arkecosystem/core-kernel";

import secrets from "../internal/passphrases.json";
import { TransactionFactory } from "./transaction-factory";

export class ApiHelpers {
    public constructor(private readonly app: Contracts.Kernel.Application) {}

    public async request(method, path, params = {}, headers = {}) {
        // Build URL params from _params_ object for GET / DELETE requests
        const getParams = Object.entries(params)
            .map(([key, val]) => `${key}=${val}`)
            .join("&");

        const url = `http://localhost:4003/api/${path}`;

        // Injecting the request into Hapi server
        const injectOptions = {
            method,
            url: ["GET", "DELETE"].includes(method) ? `${url}?${getParams}` : url,
            headers: {
                ...headers,
                ...{
                    "Content-Type": "application/json",
                },
            },
            payload: ["GET", "DELETE"].includes(method) ? {} : params,
        };

        // @ts-ignore
        const response = await this.app.get(Identifiers.HTTP).inject(injectOptions);

        const data = typeof response.result === "string" ? JSON.parse(response.result) : response.result;

        Object.assign(response, { data, status: response.statusCode });

        return response;
    }

    public expectJson(response) {
        expect(response.data).toBeObject();
    }

    public expectStatus(response, code) {
        expect(response.status).toBe(code);
    }

    public expectResource(response) {
        expect(response.data.data).toBeObject();
    }

    public expectCollection(response) {
        expect(Array.isArray(response.data.data)).toBe(true);
    }

    public expectPaginator(response) {
        expect(response.data.meta).toBeObject();
        expect(response.data.meta).toHaveProperty("count");
        expect(response.data.meta).toHaveProperty("pageCount");
        expect(response.data.meta).toHaveProperty("totalCount");
        expect(response.data.meta).toHaveProperty("next");
        expect(response.data.meta).toHaveProperty("previous");
        expect(response.data.meta).toHaveProperty("self");
        expect(response.data.meta).toHaveProperty("first");
        expect(response.data.meta).toHaveProperty("last");
    }

    public expectSuccessful(response, statusCode = 200) {
        this.expectStatus(response, statusCode);

        this.expectJson(response);
    }

    public expectError(response, statusCode = 404) {
        this.expectStatus(response, statusCode);

        this.expectJson(response);

        expect(response.data.statusCode).toBeNumber();
        expect(response.data.error).toBeString();
        expect(response.data.message).toBeString();
    }

    public expectTransaction(transaction) {
        expect(transaction).toBeObject();
        expect(transaction).toHaveProperty("id");
        expect(transaction).toHaveProperty("blockId");
        expect(transaction).toHaveProperty("type");
        expect(transaction).toHaveProperty("typeGroup");
        expect(transaction).toHaveProperty("amount");
        expect(transaction).toHaveProperty("fee");
        expect(transaction).toHaveProperty("sender");

        if ([1, 2].includes(transaction.type)) {
            expect(transaction.recipient).toBeString();
        }

        expect(transaction.signature).toBeString();
        expect(transaction.confirmations).toBeNumber();
    }

    public expectBlock(block, expected: any = {}) {
        expect(block).toBeObject();
        expect(block.id).toBeString();
        expect(block.version).toBeNumber();
        expect(block.height).toBeNumber();
        expect(block).toHaveProperty("previous"); // `undefined` or String
        expect(block).toHaveProperty("forged");
        expect(block.forged.reward).toBeString();
        expect(block.forged.fee).toBeString();
        expect(block.forged.total).toBeString();
        expect(block.forged.amount).toBeString();
        expect(block).toHaveProperty("payload");
        expect(block.payload.length).toBeNumber();
        expect(block.payload.hash).toBeString();
        expect(block).toHaveProperty("generator");
        expect(block.generator.publicKey).toBeString();
        expect(block.signature).toBeString();
        expect(block.transactions).toBeNumber();

        for (const attr of Object.keys(expected || {})) {
            expect(block[attr]).toEqual(expected[attr]);
        }
    }

    public expectDelegate(delegate, expected: any = {}) {
        expect(delegate).toBeObject();
        expect(delegate.username).toBeString();
        expect(delegate.address).toBeString();
        expect(delegate.publicKey).toBeString();
        expect(delegate.votes).toBeString();
        expect(delegate.rank).toBeNumber();
        expect(delegate.blocks).toBeObject();
        expect(delegate.blocks.produced).toBeNumber();
        expect(delegate.production).toBeObject();
        expect(delegate.production.approval).toBeNumber();
        expect(delegate.forged.fees).toBeString();
        expect(delegate.forged.rewards).toBeString();
        expect(delegate.forged.total).toBeString();

        for (const attr of Object.keys(expected || {})) {
            expect(delegate[attr]).toBe(expected[attr]);
        }
    }

    public expectWallet(wallet) {
        expect(wallet).toBeObject();
        expect(wallet).toHaveProperty("address");
        expect(wallet).toHaveProperty("publicKey");
        expect(wallet).toHaveProperty("nonce");
        expect(wallet).toHaveProperty("balance");
        expect(wallet).toHaveProperty("attributes");
    }

    public expectLock(lock) {
        expect(lock).toBeObject();
        expect(lock).toHaveProperty("lockId");
        expect(lock).toHaveProperty("senderPublicKey");
        expect(lock).toHaveProperty("recipientId");
        expect(lock).toHaveProperty("amount");
        expect(lock).toHaveProperty("secretHash");
        expect(lock).toHaveProperty("expirationType");
        expect(lock).toHaveProperty("expirationValue");
        expect(lock).toHaveProperty("isExpired");
        expect(lock.timestamp).toBeObject();
        expect(lock.timestamp.epoch).toBeNumber();
        expect(lock.timestamp.unix).toBeNumber();
        expect(lock.timestamp.human).toBeString();
    }

    // todo: fix the use of the factory
    public async createTransfer(passphrase?: string, nonce: number = 0) {
        const transaction = TransactionFactory.initialize()
            .withVersion(2)
            .transfer("AZFEPTWnn2Sn8wDZgCRF8ohwKkrmk2AZi1", 100000000, "test")
            .withPassphrase(passphrase || secrets[0])
            .withNonce(Utils.BigNumber.make(nonce))
            .createOne();

        await this.request("POST", "transactions", { transactions: [transaction] });

        return transaction;
    }
}
