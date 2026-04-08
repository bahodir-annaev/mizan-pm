# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# ArchPlan Task Manager

## Stack
- NestJS 10, TypeScript 5, TypeORM 0.3, PostgreSQL 16
- JWT auth with access/refresh tokens
- class-validator for DTOs

## Architecture
- DDD with bounded contexts: identity, organization, project-management, time-tracking
- Each module: domain/ (entities, value-objects, repositories interfaces), application/ (services, commands, dtos), infrastructure/ (persistence, guards), presentation/ (controllers)
- Shared base classes in src/shared/

## Conventions
- UUIDs for all PKs
- Soft deletes via deleted_at
- All endpoints prefixed /api/v1
- Response envelope: { data, meta, errors }
