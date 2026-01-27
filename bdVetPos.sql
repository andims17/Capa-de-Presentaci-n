------------------------------------------------------------
-- Crear Base de Datos
------------------------------------------------------------
IF DB_ID('VetPostDB') IS NULL
    CREATE DATABASE VetPostDB;
GO

USE VetPostDB;
GO

------------------------------------------------------------
-- TABLA: ROLES
------------------------------------------------------------
CREATE TABLE Roles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL UNIQUE
);

------------------------------------------------------------
-- TABLA: USUARIOS
------------------------------------------------------------
CREATE TABLE Usuarios (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    NombreCompleto VARCHAR(150) NOT NULL,
    Email VARCHAR(150) NOT NULL UNIQUE,
    Telefono VARCHAR(30),
    PasswordHash VARCHAR(255) NOT NULL,
    RolId INT NOT NULL,
    Activo BIT DEFAULT 1,
    UltimoAcceso DATETIME NULL,

    FOREIGN KEY (RolId) REFERENCES Roles(Id)
);

------------------------------------------------------------
-- TABLA: CLIENTES
------------------------------------------------------------
CREATE TABLE Clientes (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    NombreCompleto VARCHAR(150) NOT NULL,
    Email VARCHAR(150),
    Telefono VARCHAR(30),
    Direccion VARCHAR(200)
);

------------------------------------------------------------
-- TABLA: MASCOTAS
------------------------------------------------------------
CREATE TABLE Mascotas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ClienteId INT NOT NULL,
    Nombre VARCHAR(100) NOT NULL,
    Especie VARCHAR(50),
    Raza VARCHAR(50),
    Sexo VARCHAR(10),
    FechaNacimiento DATE,

    FOREIGN KEY (ClienteId) REFERENCES Clientes(Id)
);

------------------------------------------------------------
-- TABLA: CITAS
------------------------------------------------------------
CREATE TABLE Citas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    MascotaId INT NOT NULL,
    UsuarioId INT NOT NULL,       -- Veterinario / usuario asignado
    Fecha DATE NOT NULL,
    Hora TIME NOT NULL,
    Servicio VARCHAR(100) NOT NULL,
    Estado VARCHAR(20) DEFAULT 'Pendiente',

    FOREIGN KEY (MascotaId) REFERENCES Mascotas(Id),
    FOREIGN KEY (UsuarioId) REFERENCES Usuarios(Id)
);

------------------------------------------------------------
-- TABLA: CATEGORIAS DE PRODUCTOS
------------------------------------------------------------
CREATE TABLE Categorias (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Descripcion VARCHAR(200)
);

------------------------------------------------------------
-- TABLA: PRODUCTOS
------------------------------------------------------------
CREATE TABLE Productos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CategoriaId INT NOT NULL,
    Nombre VARCHAR(150) NOT NULL,
    Codigo VARCHAR(50) UNIQUE,
    Precio DECIMAL(10,2) NOT NULL,
    Stock INT NOT NULL DEFAULT 0,
    StockMinimo INT NOT NULL DEFAULT 0,

    FOREIGN KEY (CategoriaId) REFERENCES Categorias(Id)
);

------------------------------------------------------------
-- TABLA: PROVEEDORES
------------------------------------------------------------
CREATE TABLE Proveedores (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(150) NOT NULL,
    Email VARCHAR(120),
    Telefono VARCHAR(30),
    Direccion VARCHAR(200)
);

------------------------------------------------------------
-- TABLA: COMPRAS
------------------------------------------------------------
CREATE TABLE Compras (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ProveedorId INT NOT NULL,
    UsuarioId INT NOT NULL,
    Fecha DATETIME NOT NULL DEFAULT GETDATE(),
    Total DECIMAL(10,2),

    FOREIGN KEY (ProveedorId) REFERENCES Proveedores(Id),
    FOREIGN KEY (UsuarioId) REFERENCES Usuarios(Id)
);

------------------------------------------------------------
-- TABLA: COMPRAS DETALLE
------------------------------------------------------------
CREATE TABLE ComprasDetalle (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CompraId INT NOT NULL,
    ProductoId INT NOT NULL,
    Cantidad INT NOT NULL,
    CostoUnitario DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (CompraId) REFERENCES Compras(Id),
    FOREIGN KEY (ProductoId) REFERENCES Productos(Id)
);

------------------------------------------------------------
-- TABLA: VENTAS
------------------------------------------------------------
CREATE TABLE Ventas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ClienteId INT NULL,
    UsuarioId INT NOT NULL,
    Fecha DATETIME NOT NULL DEFAULT GETDATE(),
    Total DECIMAL(10,2),

    FOREIGN KEY (ClienteId) REFERENCES Clientes(Id),
    FOREIGN KEY (UsuarioId) REFERENCES Usuarios(Id)
);

------------------------------------------------------------
-- TABLA: VENTAS DETALLE
------------------------------------------------------------
CREATE TABLE VentasDetalle (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    VentaId INT NOT NULL,
    ProductoId INT NOT NULL,
    Cantidad INT NOT NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (VentaId) REFERENCES Ventas(Id),
    FOREIGN KEY (ProductoId) REFERENCES Productos(Id)
);

------------------------------------------------------------
-- TABLA: TRANSPORTE (Para delivery, env�os o log�stica)
------------------------------------------------------------
CREATE TABLE Transporte (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ProveedorId INT NOT NULL,
    TipoVehiculo VARCHAR(50) NOT NULL,
    Placa VARCHAR(20),
    NombreConductor VARCHAR(100),
    Telefono VARCHAR(30),

    FOREIGN KEY (ProveedorId) REFERENCES Proveedores(Id)
);

------------------------------------------------------------
-- TABLA: ENV�OS (si deseas asociar ventas con transporte)
------------------------------------------------------------
CREATE TABLE Envios (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    VentaId INT NOT NULL,
    TransporteId INT NOT NULL,
    FechaEnvio DATETIME DEFAULT GETDATE(),
    Estado VARCHAR(20) DEFAULT 'Pendiente',

    FOREIGN KEY (VentaId) REFERENCES Ventas(Id),
    FOREIGN KEY (TransporteId) REFERENCES Transporte(Id)
);

------------------------------------------------------------
-- FIN
------------------------------------------------------------
PRINT 'Base de datos VetPost creada exitosamente.';
