import test from "ava";

//This example shows how to use the truthy and falsy assertions in AVA.

test("truthy and falsy values", (t) => {
	t.truthy("hello world");
	t.falsy("");
});
