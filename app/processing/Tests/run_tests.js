const tests = require('./unit_tests.js');

var tests_passed = 0;
var tests_failed = 0;
var failed_tests = [];

function run_test(func, name) {
	if (func()){
		console.log(name + ": passed");
		tests_passed += 1;
		return;
	}

	tests_failed += 1;
	failed_tests.push(name);
}

function recap_failed_tests() {
	for (var i=0; i<failed_tests.length;i++){
		console.log("Failed Test: " + failed_tests[i]);
	}
}

function test_test() {
	console.log("I am a test");
	return true;
}

console.log("Beginning to run tests...");

run_test(test_test, "Testing test");
//run_test(tests.AddItem, "What?");
run_test(tests.TestReset, "Hello There!");

console.log("#########################");
console.log("#########################");
recap_failed_tests();

