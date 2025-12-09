import {
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { navigateToLogin } from '../utils/navigationUtils';

const { width, height } = Dimensions.get('window');

export default function LandingPage() {
  return (
    <View style={styles.container}>
      {/* Doctor Illustration Section */}
      <View style={styles.illustrationContainer}>
        <Image
          source={require('../assets/images/landing_page.logo.png')}
          style={styles.doctorImage}
        />
      </View>

      {/* Main Heading */}
      <Text style={[styles.mainHeading, { marginBottom: 0 }]}>
        Connect with a Doctor
      </Text>
      <Text style={[styles.mainHeading, { marginTop: 0 }]}>
        Anytime, Anywhere.
      </Text>

      {/* Subheading */}
      <Text style={styles.subheading}>
        Quality healthcare at your fingertips – wherever you are.
      </Text>

      {/* Buttons Container */}
      <View style={styles.buttonContainer}>
        {/* Doctor Button */}
        <TouchableOpacity 
          style={styles.doctorButton}
          onPress={() => navigateToLogin({ userType: 'doctor' })}
        >
          <Text style={styles.doctorButtonText}>I'm a Doctor</Text>
        </TouchableOpacity>

        {/* Patient Button */}
        <TouchableOpacity 
          style={styles.patientButton}
          onPress={() => navigateToLogin({ userType: 'patient' })}
        >
          <Text style={styles.patientButtonText}>I'm a Patient</Text>
        </TouchableOpacity>

        
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by Hire Africa</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 180,
  },
  doctorImage: {
    width: 180,
    height: 135,
    resizeMode: 'contain',
    marginTop: -110,
  },
  mainHeading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 8,
    lineHeight: 32,
  },
  subheading: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 120,
    marginTop: 80,
  },
  doctorButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.10)',
        width: 320,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
        elevation: 5,
        width: width * 0.8,
      },
    }),
  },
  doctorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.10)',
        width: 320,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
        elevation: 5,
        width: width * 0.8,
      },
    }),
  },
  patientButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginPromptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  loginPromptText: {
    color: '#222',
    fontSize: 15,
  },
  loginLink: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  footer: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
  },
}); 