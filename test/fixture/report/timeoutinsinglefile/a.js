import test from "../../../..";

test("passes", t => t.pass());

test.cb("slow", t => {
	setTimeout(t.end, 5000);
});
test.cb("slow two ", t => {
	setTimeout(t.end, 5000);
});

test("passes two", t => t.pass());

