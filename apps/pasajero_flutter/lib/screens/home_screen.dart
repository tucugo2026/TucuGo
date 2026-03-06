import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('TucuGo Pasajero')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const TextField(decoration: InputDecoration(labelText: 'Origen')),
            const SizedBox(height: 12),
            const TextField(decoration: InputDecoration(labelText: 'Destino')),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                title: const Text('Tarifa estimada'),
                subtitle: const Text('\$ 0,00'),
                trailing: ElevatedButton(
                  onPressed: () {},
                  child: const Text('Pedir viaje'),
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Expanded(
              child: Center(
                child: Text('Acá luego irá el mapa y el seguimiento del viaje'),
              ),
            )
          ],
        ),
      ),
    );
  }
}
