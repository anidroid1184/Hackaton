# PBI-OPS-ADMIN-01-02

## Objetivo
Implementar bypass local de autenticacion para Operaciones TR via variables de entorno y redireccion por rol.

## Estado
InProgress

## Test Plan
- Login mock correcto redirige a `/operaciones/dashboard`.
- Login mock incorrecto muestra error.
- Sesion mock persistida permite entrar a rutas protegidas tras recarga.
