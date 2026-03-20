/**
 * Jest global setup — runs after the test framework is installed
 * in each test worker.
 *
 * Adds custom DOM matchers from @testing-library/jest-dom so tests
 * can use assertions like:
 *   expect(element).toBeInTheDocument()
 *   expect(input).toHaveValue('foo')
 */
import "@testing-library/jest-dom";
