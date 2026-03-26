import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:ui';
import 'firebase_options.dart';
import 'screens/availability_screen.dart';
import 'screens/shifts_screen.dart';

// --- Onboarding / JITL System ---

class OnboardingManager {
  static final OnboardingManager instance = OnboardingManager._();
  OnboardingManager._();

  Future<bool> hasSeen(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('seen_$key') ?? false;
  }

  Future<void> markSeen(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('seen_$key', true);
  }
}

class CyberBeeTip extends StatelessWidget {
  final String message;
  final VoidCallback onDismiss;

  const CyberBeeTip({super.key, required this.message, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6366F1).withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(shape: BoxShape.circle),
            child: ClipOval(child: Image.asset('assets/assistant.png', fit: BoxFit.cover)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('CYBERBEE INSIGHT', 
                  style: TextStyle(color: Color(0xFF818CF8), fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.2)),
                const SizedBox(height: 4),
                Text(message, style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.4)),
              ],
            ),
          ),
          IconButton(
            onPressed: onDismiss,
            icon: const Icon(Icons.close, color: Colors.white24, size: 18),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.2, end: 0, curve: Curves.easeOutBack);
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Initialize Analytics
  FirebaseAnalytics.instance.logAppOpen();

  // Handle Flutter framework errors
  FlutterError.onError = (errorDetails) {
    FirebaseCrashlytics.instance.recordFlutterFatalError(errorDetails);
  };

  // Handle asynchronous errors not caught by Flutter
  PlatformDispatcher.instance.onError = (error, stack) {
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    return true;
  };

  runApp(
    const ProviderScope(
      child: ScheduleAssistantMobile(),
    ),
  );
}

class ScheduleAssistantMobile extends StatelessWidget {
  const ScheduleAssistantMobile({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'W2W Sync',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        primaryColor: const Color(0xFF6366F1),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1),
          brightness: Brightness.dark,
          surface: const Color(0xFF111827),
          primary: const Color(0xFF6366F1),
          secondary: const Color(0xFF0EA5E9),
        ),
        scaffoldBackgroundColor: const Color(0xFF0B1120),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme),
        cardTheme: CardThemeData(
          color: Colors.white.withOpacity(0.03),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: BorderSide(color: Colors.white.withOpacity(0.08)),
          ),
        ),
      ),
      home: const MainNavigationScreen(),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _selectedIndex = 0;
  String? _activeTip;
  
  final List<Widget> _screens = [
    const AvailabilityScreen(),
    const ShiftsScreen(),
    const _SettingsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _checkFirstTime('home', 'Welcome to the Hive! 👋 Your availability here mirrors WhenToWork automatically.');
  }

  void _checkFirstTime(String key, String message) async {
    final hasSeen = await OnboardingManager.instance.hasSeen(key);
    if (!hasSeen) {
      await Future.delayed(const Duration(seconds: 2)); // Wait for psychological timing
      if (mounted) {
        setState(() => _activeTip = message);
      }
    }
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
      _activeTip = null; // Clear old tip
    });
    
    // Check for section-specific tips
    if (index == 1) _checkFirstTime('shifts', 'Your Workload is now smart-categorized! Toggle a manual sync if the CyberBee is napping.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B1120),
      body: Stack(
        children: [
          IndexedStack(
            index: _selectedIndex,
            children: _screens,
          ),
          if (_activeTip != null)
            Positioned(
              bottom: 20,
              left: 0,
              right: 0,
              child: CyberBeeTip(
                message: _activeTip!,
                onDismiss: () {
                  setState(() => _activeTip = null);
                  String key = _selectedIndex == 0 ? 'home' : (_selectedIndex == 1 ? 'shifts' : 'settings');
                  OnboardingManager.instance.markSeen(key);
                },
              ),
            ),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05))),
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: _onItemTapped,
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedItemColor: const Color(0xFF6366F1),
          unselectedItemColor: Colors.white.withOpacity(0.3),
          showSelectedLabels: true,
          showUnselectedLabels: false,
          type: BottomNavigationBarType.fixed,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home_rounded), label: 'Home'),
            BottomNavigationBarItem(icon: Icon(Icons.calendar_month_rounded), label: 'Workload'),
            BottomNavigationBarItem(icon: Icon(Icons.settings_rounded), label: 'Settings'),
          ],
        ),
      ),
    );
  }
}

class _SettingsScreen extends StatelessWidget {
  const _SettingsScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B1120),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 48),
          const Text('Settings', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
          const SizedBox(height: 32),
          _buildActionItem('Push Notifications', 'Manage App Alerts', Icons.notifications_none_rounded, () {
             ScaffoldMessenger.of(context).showSnackBar(
               const SnackBar(
                 content: Text('CyberBee: Notification permissions aligned with OS preferences.'),
                 backgroundColor: Color(0xFF6366F1),
               ),
             );
          }),
          _buildToggle('Sync Reminders', true, subtitle: '(Typically Sun @ 8 PM based on patterns)'),
          _buildStatusItem('Calendar Integration', 'jmoreno@gmail.com', Icons.account_circle_outlined),
          const SizedBox(height: 48),
          TextButton.icon(
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  backgroundColor: const Color(0xFF1E293B),
                  title: const Text('Log Out?', style: TextStyle(color: Colors.white)),
                  content: const Text('CyberBee will stop syncing your hives. Continue?', style: TextStyle(color: Colors.white70)),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
                    TextButton(
                      onPressed: () async {
                        final prefs = await SharedPreferences.getInstance();
                        await prefs.clear(); // Reset everything for a clean slate
                        if (context.mounted) Navigator.pop(context);
                      }, 
                      child: const Text('LOG OUT', style: TextStyle(color: Color(0xFFFF4D4D))),
                    ),
                  ],
                ),
              );
            },
            icon: const Icon(Icons.logout, color: Color(0xFFFF4D4D)),
            label: const Text('Log Out', style: TextStyle(color: Color(0xFFFF4D4D))),
          ),
        ],
      ),
    );
  }

  Widget _buildToggle(String label, bool value, {String? subtitle}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                  if (subtitle != null)
                    Text(subtitle, style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 11)),
                ],
              ),
            ),
            Switch(value: value, onChanged: (v) {}, activeColor: const Color(0xFF6366F1)),
          ],
        ),
      ),
    );
  }

  Widget _buildActionItem(String label, String value, IconData icon, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.05)),
          ),
          child: Row(
            children: [
              Icon(icon, color: const Color(0xFF6366F1), size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                    Text(value, style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 11)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.white24, size: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusItem(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF6366F1), size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                  Text(value, style: TextStyle(color: const Color(0xFF10B981).withOpacity(0.8), fontSize: 11, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const Icon(Icons.link_rounded, color: Color(0xFF10B981), size: 16),
          ],
        ),
      ),
    );
  }
}
