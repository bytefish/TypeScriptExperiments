import { describe, it, } from 'mocha';
import { Temporal } from "@js-temporal/polyfill";
import { deepStrictEqual } from "assert";

import { deserialize, JsonConverter, JsonProperty, JsonType, transform, transformArray } from './deserializer';

const fixtureChildOrder1 = `
    { 
        "orderId": 1,
        "orderNumber": "8472-423-14",
        "pickupDateTime":"2018-07-15T05:35:03.000Z"
    }`;

const fixtureChildOrder2 = `
    { 
        "orderId": 2,
        "orderNumber": "1341-7856-75189",
        "pickupDateTime":"2019-01-12T01:15:03.000Z"
    }`;

const fixtureCustomer = `
    {
        "customerId": 4,
        "customerName": "Northwind Toys",
        "orders": [
            ${fixtureChildOrder1},
            ${fixtureChildOrder2}
        ]
    }
`;

const fixturePlainDateExample = `
    {
        "shippingDate": "2012-01-01"
    }
`;

export class JsonConverterExample {

    @JsonProperty("shippingDate")
    @JsonConverter((val) => Temporal.PlainDate.from(val))
    shippingDate?: Temporal.PlainDate;

}

const fixtureDifferentNameExample = `
    {
        "myShippingDate": "2012-01-01"
    }
`;

export class JsonPropertyExample {

    @JsonProperty("myShippingDate")
    shippingDate?: string;
}

const fixtureODataEntityResponse = `
    {
        "@odata.context" : "http://localhost:5000/odata/#Customer",
        "@odata.count" : 2,
        "orderId": 2,
        "orderNumber": "1341-7856-75189",
        "pickupDateTime":"2019-01-12T01:15:03.000Z"
    }
`;

const fixtureODataEntitiesResponse = `
    {
        "@odata.context" : "http://localhost:5000/odata/#Customer",
        "@odata.count" : 2,
        "value" : [
            ${fixtureChildOrder1},
            ${fixtureChildOrder2} 
        ]
    }
`;

export class Order {

    @JsonProperty("orderId")
    orderId?: number;

    @JsonProperty("orderNumber")
    orderNumber?: string;

    @JsonProperty("pickupDateTime")
    @JsonType(Date)
    pickupDateTime?: Date;
}

export class Customer {

    @JsonProperty("orderId")
    customerId?: number;

    @JsonProperty("customerName")
    customerName?: string;

    @JsonProperty("orders")
    @JsonType([Order])
    orders?: Order[];
}

export class OrderWithoutDecorators {

    orderId?: number;

    orderNumber?: string;

    pickupDateTime?: Date;
}

export interface ODataEntityResponse<TEntity> {

    /**
     * Metadata.
     */
    readonly metadata: Map<string, any>;

    /**
     * Entities.
     */
    readonly entity: TEntity;
}

export interface ODataEntitiesResponse<TEntity> {

    /**
     * Metadata.
     */
    readonly metadata: Map<string, any>;

    /**
     * Entities.
     */
    readonly value: TEntity[];
}

/**
 * Deserializes JSON into JavaScript objects.
 */
export class ODataResponseBuilder {

    static parseEntityResponse<TEntity>(json: string, classType: any): ODataEntityResponse<TEntity> {
        const data = JSON.parse(json);
        return {
            metadata: ODataResponseBuilder.getMetadata(data),
            entity: transform(data, classType)
        };
    }

    static parseEntitiesResponse<TEntity>(json: string, classType: any): ODataEntitiesResponse<TEntity> {
        const data = JSON.parse(json);
        return {
            metadata: ODataResponseBuilder.getMetadata(data),
            value: transformArray(data.value, classType)
        };
    }

   private static getMetadata(data: any): Map<string, any> {
       const metadata = new Map<string, any>();

       Object.keys(data)
           .filter((key) => key.startsWith("@odata"))
           .forEach((key) => metadata.set(key.replace("@odata.", ""), data[key]));

       return metadata;
   }
}

describe('JSON.parse', () => {

    it('Should not parse string as Date', () => {
        
        // prepare
        const json = `
        { 
            "orderId": 1,
            "orderNumber": "8472-423-14",
            "pickupDateTime":"2018-07-15T05:35:03.000Z"
        }`;

        // act
        const verifyResult = JSON.parse(json) as Order;

        // verify
        const isTypeOfString = typeof verifyResult.pickupDateTime === "string";
        const isInstanceOfDate = verifyResult.pickupDateTime instanceof Date;
        

        deepStrictEqual(isTypeOfString, true);
        deepStrictEqual(isInstanceOfDate, false);
    }); 

});


describe('deserialize', () => {

    it('Decorated Order should parse Date', () => {
        // prepare        
        const json = `
        { 
            "orderId": 1,
            "orderNumber": "8472-423-14",
            "pickupDateTime":"2018-07-15T05:35:03.000Z"
        }`;

        // act
        const verifyResult: Order = deserialize<Order>(json, Order);

        // verify
        const isTypeOfObject = typeof verifyResult.pickupDateTime === "object";
        const isInstanceOfDate = verifyResult.pickupDateTime instanceof Date;
        
        deepStrictEqual(isTypeOfObject, true);
        deepStrictEqual(isInstanceOfDate, true);
    }); 

    it('Should Convert Child Array and Dates', () => {
        // prepare
        //act
        const customer: Customer = deserialize(fixtureCustomer, Customer);
        
        deepStrictEqual(customer.orders[0].pickupDateTime, new Date("2018-07-15T05:35:03.000Z"));
        deepStrictEqual(customer.orders[1].pickupDateTime, new Date("2019-01-12T01:15:03.000Z"));
    }); 

    it('Should Convert Plain Date', () => {
        // prepare
        // act
        const verifyResult: JsonConverterExample = deserialize(fixturePlainDateExample, JsonConverterExample);
        
        deepStrictEqual(verifyResult.shippingDate, Temporal.PlainDate.from("2012-01-01"));
    }); 

    it('Should Convert by Name', () => {
        // prepare
        //act
        const verifyResult: JsonConverterExample = deserialize(fixtureDifferentNameExample, JsonPropertyExample);

        // verify
        deepStrictEqual(verifyResult.shippingDate, "2012-01-01");
    }); 

    it('Should Convert OData Entity Response', () => {
        // prepare
        const expectedODataResponse: ODataEntityResponse<Order> = {
            metadata: new Map<string, any>([
                ["context", "http://localhost:5000/odata/#Customer"],
                ["count", 2]
            ]),
              entity : {
                orderId: 2,
                orderNumber: "1341-7856-75189",
                pickupDateTime:new Date("2019-01-12T01:15:03.000Z")
              }
        };

        // act
        const verifyResult = ODataResponseBuilder.parseEntityResponse<Order>(fixtureODataEntityResponse, Order);

        // verify
        deepStrictEqual(verifyResult.metadata[0], expectedODataResponse.metadata[0]);
        deepStrictEqual(verifyResult.metadata[1], expectedODataResponse.metadata[1]);

        deepStrictEqual(verifyResult.entity.orderId, expectedODataResponse.entity.orderId);
        deepStrictEqual(verifyResult.entity.orderNumber, expectedODataResponse.entity.orderNumber);
        deepStrictEqual(verifyResult.entity.pickupDateTime, expectedODataResponse.entity.pickupDateTime);
    }); 

    
    it('Should Convert OData Entities Response', () => {

        const expectedODataResponse: ODataEntitiesResponse<Order> = {
            metadata: new Map<string, any>([
                ["context", "http://localhost:5000/odata/#Customer"],
                ["count", 2]
            ]),
              value: [
                {
                  orderId: 1,
                  orderNumber: '8472-423-14',
                  pickupDateTime: new Date("2018-07-15T05:35:03.000Z")
                },
                {
                  orderId: 2,
                  orderNumber: '1341-7856-75189',
                  pickupDateTime: new Date("2019-01-12T01:15:03.000Z")
                }
              ]
        };

        const verifyResult = ODataResponseBuilder.parseEntitiesResponse<Order>(fixtureODataEntitiesResponse, Order);

        deepStrictEqual(verifyResult.metadata[0], expectedODataResponse.metadata[0]);
        deepStrictEqual(verifyResult.metadata[1], expectedODataResponse.metadata[1]);

        deepStrictEqual(verifyResult.value.length, 2);

        deepStrictEqual(verifyResult.value[0].orderId, expectedODataResponse.value[0].orderId);
        deepStrictEqual(verifyResult.value[0].orderNumber, expectedODataResponse.value[0].orderNumber);
        deepStrictEqual(verifyResult.value[0].pickupDateTime, expectedODataResponse.value[0].pickupDateTime);

        deepStrictEqual(verifyResult.value[1].orderId, expectedODataResponse.value[1].orderId);
        deepStrictEqual(verifyResult.value[1].orderNumber, expectedODataResponse.value[1].orderNumber);
        deepStrictEqual(verifyResult.value[1].pickupDateTime, expectedODataResponse.value[1].pickupDateTime);
    }); 
});