import 'package:flutter/material.dart';
import 'status_screen.dart';

class RegisterDriverScreen extends StatelessWidget {
  const RegisterDriverScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Alta de conductor')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const TextField(decoration: InputDecoration(labelText: 'Nombre completo')),
            const SizedBox(height: 12),
            const TextField(decoration: InputDecoration(labelText: 'DNI')),
            const SizedBox(height: 12),
            const TextField(decoration: InputDecoration(labelText: 'Número de licencia')),
            const SizedBox(height: 12),
            const TextField(decoration: InputDecoration(labelText: 'Patente')),
            const SizedBox(height: 12),
            const TextField(decoration: InputDecoration(labelText: 'Marca y modelo')),
            const SizedBox(height: 24),
            const Text('Acá luego se integran los uploads de DNI, seguro, cédula y fotos del auto.'),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const StatusScreen()),
                );
              },
              child: const Text('Enviar para revisión'),
            )
          ],
        ),
      ),
    );
  }
}
