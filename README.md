# EntityFramework Core Experiments #

This repository contains various experiments with TypeScript.

## /json-deserialization ##

If you have ever worked with JSON in an Angular application, you know that you cannot 
trust the deserialized results. JavaScript doesn't have Reflection, JSON doesn't have 
a data type for a `Date` and so... `JSON.parse` doesn't know that you want the 
incoming `string` value `"2018-07-15T05:35:03.000Z"` converted into a `Date`.

Say you have defined an interface `Order` as:

```typescript 
export interface Order {
    orderId?: number;
    orderNumber?: string;
    pickupDateTime?: Date
}
```

You call your Angular `HttpClient` with the generic `HttpClient#get<T>` overload: 

```typescript
this.httpClient
    .get<Order>(url, ...)
    .pipe(
        map((response: Order) => {
            // Work with the Response ...
        })
    );
```

Your Webservice responds with a totally valid JSON `Order` as:

```json
{ 
    "orderId": 1,
    "orderNumber": "8472-423-14",
    "pickupDateTime":"2018-07-15T05:35:03.000Z"
}
```

And with a simple test, we can see, that the returned `pickupDateTime` is actually a `string` and not a `Date`:

```typescript
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
```

In this example we will take a look at providing a set of decorators (`@JsonProperty`, `@JsonType`, ...) to 
decorate classes and deserialize the JSON into the correct types. It will look like this:

```typescript
export class Order {

    @JsonProperty("orderId")
    orderId?: number;

    @JsonProperty("orderNumber")
    orderNumber?: string;

    @JsonProperty("pickupDateTime")
    @JsonType(Date)
    pickupDateTime?: Date;
}
```

And with a simple test, we will see the correct types on our deserialized object:

```typescript
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
});
```

That enables us a bit more type-safety, when deserializing incoming JSON data.