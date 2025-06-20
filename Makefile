.PHONY: help install dev build start lint lint-fix format check test test-e2e test-all db-generate db-migrate db-studio db-push db-pull db-check db-up run

# Default target
.DEFAULT_GOAL := help

# Colors for formatting
COLOR_RESET = \033[0m
COLOR_BOLD = \033[1m
COLOR_CYAN = \033[36m
COLOR_GREEN = \033[32m
COLOR_YELLOW = \033[33m

# Help target
help: ## Display available commands with descriptions
	@echo -e "$(COLOR_BOLD)Available commands:$(COLOR_RESET)"
	@echo -e "$(COLOR_BOLD)===================$(COLOR_RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(COLOR_CYAN)%-20s$(COLOR_RESET) %s\n", $$1, $$2}'

# Environment Setup
install: ## Install dependencies and set up Git hooks
	@echo -e "$(COLOR_BOLD)Installing dependencies...$(COLOR_RESET)"
	pnpm install
	@echo -e "$(COLOR_BOLD)Setting up Git hooks...$(COLOR_RESET)"
	@if [ ! -d ".husky" ]; then pnpm exec husky init; fi

# Development Commands
run: ## Run the client in development mode
	@echo -e "$(COLOR_BOLD)Starting development server...$(COLOR_RESET)"
	pnpm run dev

dev: run ## Alias for run command

# Code Quality Commands
lint: ## Run linting
	@echo -e "$(COLOR_BOLD)Running linters...$(COLOR_RESET)"
	pnpm run lint

lint-fix: ## Fix linting issues
	@echo -e "$(COLOR_BOLD)Fixing linting issues...$(COLOR_RESET)"
	pnpm run lint:fix

format: ## Format code
	@echo -e "$(COLOR_BOLD)Formatting code...$(COLOR_RESET)"
	pnpm run format

type-check: ## Run TypeScript type checking
	@echo -e "$(COLOR_BOLD)Checking TypeScript types...$(COLOR_RESET)"
	pnpm run type-check

check: ## Run all code quality checks and verify build
	@echo -e "$(COLOR_BOLD)Running all checks...$(COLOR_RESET)"
	@echo -e "$(COLOR_BOLD)1/3 Fixing linting issues...$(COLOR_RESET)"
	@pnpm run lint:fix
	@echo -e "$(COLOR_BOLD)2/3 Formatting code...$(COLOR_RESET)"
	@pnpm run format
	@echo -e "$(COLOR_BOLD)3/3 Checking TypeScript types...$(COLOR_RESET)"
	@pnpm run type-check
	@echo -e "$(COLOR_GREEN)All checks completed successfully!$(COLOR_RESET)"

build: ## Build the production version of the client
	@echo -e "$(COLOR_BOLD)Building production version...$(COLOR_RESET)"
	pnpm run build

# Testing Commands
setup-tests: ## Install Playwright browsers
	@echo -e "$(COLOR_BOLD)Installing Playwright browsers...$(COLOR_RESET)"
	npx playwright install

test: ## Run unit tests only (currently there are no separate unit tests, so this is a placeholder)
	@echo -e "$(COLOR_BOLD)Running unit tests...$(COLOR_RESET)"
	@echo -e "$(COLOR_YELLOW)No unit tests configured. Add them to package.json and update this target$(COLOR_RESET)"

test-all: ## Run all tests
	@echo -e "$(COLOR_BOLD)Running all tests...$(COLOR_RESET)"
	@echo -e "$(COLOR_BOLD)Checking for existing servers on port 3000...$(COLOR_RESET)"
	@node scripts/kill-port-3000.js
	@echo -e "$(COLOR_YELLOW)Test output will be saved to test-logs.txt$(COLOR_RESET)"
	PLAYWRIGHT=True NEXT_PUBLIC_PLAYWRIGHT=True pnpm exec playwright test --reporter=dot 2>&1 | tee test-logs.txt

test-ui: ## Launch Playwright UI for interactive test debugging
	@echo -e "$(COLOR_BOLD)Launching Playwright UI...$(COLOR_RESET)"
	@echo -e "$(COLOR_BOLD)Checking for existing servers on port 3000...$(COLOR_RESET)"
	@node scripts/kill-port-3000.js
	PLAYWRIGHT=True NEXT_PUBLIC_PLAYWRIGHT=True pnpm exec playwright test --ui
