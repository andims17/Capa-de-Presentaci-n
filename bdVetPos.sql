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


------------------------------------------------------------
-- ROLES DE BASE DE DATOS
------------------------------------------------------------

INSERT INTO Roles (Nombre) VALUES ('Administrador'), ('Empleado');


------------------------------------------------------------
-- Script para el hash de la contraseña
------------------------------------------------------------


DECLARE @RolAdminId INT =
(
    SELECT TOP 1 Id
    FROM Roles
    WHERE Nombre = 'Administrador'
);

INSERT INTO Usuarios
(
    Username,
    NombreCompleto,
    Email,
    Telefono,
    PasswordHash,
    RolId,
    Activo
)
VALUES
(
    'admin',
    'Administrador VetPost',
    'admin@vetpost.local',
    NULL,
    '$2b$10$GH7f2wUP6OBdV3IpLLaFsOOUs1fZEG43iIO.7zl.PF.3TN6SyvxWy',
    @RolAdminId,
    1
);


------------------------------------------------------------
----------------Inventario STORAGE PROCEDURES---------------
------------------------------------------------------------




-- PROCEDIMIENTO ALMACENADO PARA LISTAR PRODUCTOS

CREATE PROCEDURE dbo.sp_Productos_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        p.Id,
        p.Nombre,
        p.Codigo,
        c.Nombre AS Categoria,
        p.Precio,
        p.Stock,
        p.StockMinimo
    FROM dbo.Productos p
    INNER JOIN dbo.Categorias c
        ON p.CategoriaId = c.Id;
END
GO


-- PROCEDIMIENTO ALMACENADO PARA OBTENER PRODUCTOS

CREATE PROCEDURE dbo.sp_Productos_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
        CategoriaId,
        Nombre,
        Codigo,
        Precio,
        Stock,
        StockMinimo
    FROM dbo.Productos
    WHERE Id = @Id;
END
GO


-- PROCEDIMIENTO ALMACENADO PARA INSERTAR PRODUCTOS

CREATE PROCEDURE dbo.sp_Productos_Insertar
    @CategoriaId INT,
    @Nombre NVARCHAR(150),
    @Codigo NVARCHAR(50),
    @Precio DECIMAL(10,2),
    @Stock INT,
    @StockMinimo INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Productos
    (
        CategoriaId,
        Nombre,
        Codigo,
        Precio,
        Stock,
        StockMinimo
    )
    VALUES
    (
        @CategoriaId,
        @Nombre,
        @Codigo,
        @Precio,
        @Stock,
        @StockMinimo
    );
END
GO


-- PROCEDIMIENTO ALMACENADO PARA ACTUALIZAR PRODUCTOS

CREATE PROCEDURE dbo.sp_Productos_Actualizar
    @Id INT,
    @CategoriaId INT,
    @Nombre NVARCHAR(150),
    @Codigo NVARCHAR(50),
    @Precio DECIMAL(10,2),
    @Stock INT,
    @StockMinimo INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Productos
    SET 
        CategoriaId = @CategoriaId,
        Nombre = @Nombre,
        Codigo = @Codigo,
        Precio = @Precio,
        Stock = @Stock,
        StockMinimo = @StockMinimo
    WHERE Id = @Id;
END
GO

-- PROCEDIMIENTO ALMACENADO PARA ELIMINAR PRODUCTOS

CREATE PROCEDURE dbo.sp_Productos_Eliminar
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.Productos
    WHERE Id = @Id;
END
GO


-- PROCEDIMIENTO ALMACENADO PARA WIDGETS DE INVENTARIO
CREATE PROCEDURE dbo.sp_Productos_ResumenInventario
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        COUNT(*) AS TotalProductos,
        SUM(CASE WHEN Stock > 0 THEN 1 ELSE 0 END) AS EnStock,
        SUM(CASE WHEN Stock = 0 THEN 1 ELSE 0 END) AS Agotados,
        SUM(CASE WHEN Stock <= StockMinimo THEN 1 ELSE 0 END) AS StockBajo
    FROM dbo.Productos;
END
GO

-- INVENTARIO DE PRUEBA (NOLAN)

INSERT INTO dbo.Categorias (Nombre, Descripcion) VALUES
('Medicamentos', 'Productos veterinarios'),
('Alimentos', 'Comida para mascotas'),
('Accesorios', 'Collares y juguetes');

INSERT INTO dbo.Productos
(
    CategoriaId,
    Nombre,
    Codigo,
    Precio,
    Stock,
    StockMinimo
)
SELECT c.Id, p.Nombre, p.Codigo, p.Precio, p.Stock, p.StockMinimo
FROM (
    VALUES
    ('Medicamentos', 'Antipulgas Spray', 'MED-001', 25.00, 20, 10),
    ('Medicamentos', 'Desparasitante Oral', 'MED-002', 18.75, 15, 8),
    ('Medicamentos', 'Vacuna Triple Felina', 'MED-003', 45.00, 5, 5),

    ('Alimentos', 'Alimento Perro Adulto 10kg', 'ALI-001', 32.50, 30, 15),
    ('Alimentos', 'Alimento Gato Adulto 3kg', 'ALI-002', 16.00, 25, 10),
    ('Alimentos', 'Snack Dental Canino', 'ALI-003', 6.50, 50, 20),

    ('Accesorios', 'Collar Antipulgas', 'ACC-001', 7.50, 12, 5),
    ('Accesorios', 'Juguete Hueso', 'ACC-002', 4.25, 40, 10),
    ('Accesorios', 'Cama para Mascota Mediana', 'ACC-003', 55.00, 6, 3)
) p (Categoria, Nombre, Codigo, Precio, Stock, StockMinimo)
INNER JOIN dbo.Categorias c
    ON c.Nombre = p.Categoria;



