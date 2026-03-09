import 'package:flutter/material.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const TucuGoPasajeroApp());
}

class TucuGoPasajeroApp extends StatelessWidget {
  const TucuGoPasajeroApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'TucuGo Pasajero',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.lightBlue),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}
