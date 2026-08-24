// Every test file runs against its own throwaway in-memory PostgreSQL.
process.env.SWOPIT_DATA_DIR = "memory://";
process.env.NODE_ENV = "test";
