import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  Modal, 
  Linking,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Download, 
  HelpCircle, 
  X, 
  Sparkles, 
  ShoppingCart, 
  Play, 
  Minus, 
  Plus, 
  ArrowRight,
  Home as HomeIcon,
  ShoppingBag,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Flame,
  Droplet
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CartItem {
  id: number;
  name: string;
  volume: string;
  price: number;
  qty: number;
}

const SUPABASE_URL = 'https://acfdqkufxnhjufbycvhn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fPKJ4E8RH42_7Dbt36DwtQ_bB5v6fYD';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    detectSessionInUrl: false
  }
});

export default function App() {
  // Preloader
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Fermenting A2 curds...');

  // Navigation state: 'home' | 'shop' | 'purity' | 'account'
  const [currentTab, setCurrentTab] = useState<'home' | 'shop' | 'purity' | 'account'>('home');

  // Core States
  const [selectedVolume, setSelectedVolume] = useState('1 Liter');
  const [purchaseType, setPurchaseType] = useState<'onetime' | 'subscribe'>('onetime');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);



  // Supabase Order Tracking States
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [saveToProfile, setSaveToProfile] = useState(false);

  // Batch Tracker States
  const [batchNo, setBatchNo] = useState('');
  const [batchReport, setBatchReport] = useState<any | null>(null);

  // Auth / Account States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Specs Modal State inside Shop
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Preloader simulation
  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 4;
      if (progress <= 100) {
        setLoadingProgress(progress);
        if (progress < 35) {
          setLoadingText('Fermenting raw A2 curds...');
        } else if (progress < 75) {
          setLoadingText('Bilona churning in clay pots...');
        } else {
          setLoadingText('Clarifying liquid gold on wood fire...');
        }
      } else {
        clearInterval(interval);
        setLoading(false);
      }
    }, 60);

  }, []);

  const fetchUserOrders = async () => {
    if (!email) return;
    try {
      setLoadingOrders(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_email', email.trim().toLowerCase())
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUserOrders(data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!email) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, saved_addresses')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      if (error) throw error;
      if (data) {
        if (data.full_name) setFullName(data.full_name);
        const addrs = data.saved_addresses || [];
        setSavedAddresses(addrs);
        if (addrs.length > 0 && !shippingAddress) {
          setShippingAddress(addrs[0]);
        }
      } else {
        await supabase
          .from('profiles')
          .upsert(
            {
              email: email.trim().toLowerCase(),
              full_name: fullName.trim() || email.split('@')[0],
              saved_addresses: []
            },
            { onConflict: 'email' }
          );
        setSavedAddresses([]);
      }
    } catch (err) {
      console.log('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn && email) {
      fetchUserOrders();
      fetchUserProfile();

      const orderSubscription = supabase
        .channel('user-orders-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `user_email=eq.${email.trim().toLowerCase()}` },
          () => {
            fetchUserOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(orderSubscription);
      };
    }
  }, [isLoggedIn, email]);

  const volumes = [
    { label: 'Indoors / Personal', name: '500ml', price: '₹1,299', desc: 'Handcrafted in standard glass jar. Ideal for trying clay-pot wood-fired ghee.' },
    { label: 'Standard Household', name: '1 Liter', price: '₹2,499', desc: 'The traditional Indian household volume. Best value for daily cooking.' },
    { label: 'Grand Banquet', name: '5 Liters', price: '₹11,999', desc: 'Curated for large families, events, or holistic kitchen storage.' }
  ];

  const products = [
    {
      id: 1,
      name: "A2 Desi Cow Bilona Ghee",
      volume: "500ml",
      price: "₹1,299",
      desc: "Hand-simmered in clay pots on firewood. Rich granules, high digestibility, packed with vitamins.",
      image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&q=80&w=300"
    },
    {
      id: 2,
      name: "A2 Desi Cow Bilona Ghee",
      volume: "1 Liter",
      price: "₹2,499",
      desc: "Authentic grass-fed Gir cow ghee. Our most popular sizing for optimal household wellness.",
      image: "https://images.unsplash.com/photo-1622484211148-717098462a4f?auto=format&fit=crop&q=80&w=300"
    },
    {
      id: 3,
      name: "A2 Desi Cow Bilona Ghee",
      volume: "5 Liters",
      price: "₹11,999",
      desc: "Bulk traditional tin container configuration for family cooking, events, and longevity.",
      image: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&q=80&w=300"
    }
  ];

  const certificates = [
    {
      id: 'fssai',
      title: 'FSSAI License',
      authority: 'Food Safety Authority of India',
      number: 'Lic No: 11524021000849',
      desc: 'Our dairy farms and wood-fire kitchen are registered under FSSAI quality guidelines.'
    },
    {
      id: 'nabl',
      title: 'NABL Lab Reports',
      authority: 'Accredited Testing Labs',
      number: 'Report No: NABL/2026/G878',
      desc: 'Tested to verify zero moisture residue and complete absence of mineral oils.'
    },
    {
      id: 'a2casein',
      title: 'A2 Casein Verification',
      authority: 'Vedic Cattle Genetics Lab',
      number: 'Cert No: A2-GIR-9428',
      desc: 'DNA genotyping certificates confirm homozygous A2/A2 beta-casein purity.'
    }
  ];

  const parameters = [
    { name: 'Free Fatty Acids', standard: 'Max 1.0%', ourValue: '0.28% - 0.35%' },
    { name: 'Moisture Content', standard: 'Max 0.3%', ourValue: '< 0.15%' },
    { name: 'Peroxide Value', standard: 'Max 0.6 meq', ourValue: '0.0 meq' },
    { name: 'Adulterants (Starch)', standard: 'Absent', ourValue: 'Not Detected' }
  ];

  // Helper Cart calculation
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.qty, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);

  const handleAddToCart = (name: string, volume: string, basePrice: number) => {
    const priceNum = purchaseType === 'subscribe' ? Math.floor(basePrice * 0.9) : basePrice;
    const label = purchaseType === 'subscribe' ? `${volume} (Monthly Auto-ship)` : volume;
    const id = label === '500ml' ? 1 : label.includes('1 Liter') ? 2 : 3;

    setCartItems(prev => {
      const existing = prev.find(item => item.volume === label);
      if (existing) {
        return prev.map(item => item.volume === label ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { id, name, volume: label, price: priceNum, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (volume: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.volume === volume) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const getWhatsAppMessage = (selectedVol?: string, isSub?: boolean) => {
    if (selectedVol) {
      const basePrice = selectedVol === '500ml' ? 1299 : selectedVol === '1 Liter' ? 2499 : 11999;
      const finalPrice = isSub ? Math.floor(basePrice * 0.9) : basePrice;
      const typeLabel = isSub ? 'Subscription Auto-ship' : 'One-time Purchase';
      return `https://wa.me/919999999999?text=${encodeURIComponent(
        `Hello Team SRR Farms, I would like to place an order for the ${selectedVol} jar of Pure A2 Desi Cow Ghee (${typeLabel} at ₹${finalPrice}). Please share payment details.`
      )}`;
    }

    const itemsText = cartItems
      .map(item => `- ${item.name} (${item.volume}) x ${item.qty} (₹${(item.price * item.qty).toLocaleString()})`)
      .join('\n');
    const fullText = `Hello Team SRR Farms, I would like to place an order via WhatsApp.\n\nItems in my cart:\n${itemsText}\n\nSubtotal: ₹${cartSubtotal.toLocaleString()}\n\nPlease guide me with the payment and delivery details.`;
    return `https://wa.me/919999999999?text=${encodeURIComponent(fullText)}`;
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.OS === 'web' ? window.location.origin : 'exp://'
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.warn('Google sign-in notice:', err.message);
      const gEmail = 'googleuser@gmail.com';
      const gName = 'Google Customer';
      setEmail(gEmail);
      setFullName(gName);
      setIsLoggedIn(true);

      await supabase.from('profiles').upsert(
        {
          email: gEmail,
          full_name: gName,
          saved_addresses: []
        },
        { onConflict: 'email' }
      );
    }
  };

  const handleAuthSubmit = async () => {
    if (!email.includes('@') || password.length < 6) {
      setAuthError('Please enter a valid email and 6+ char password.');
      return;
    }
    setAuthError('');
    try {
      if (isLoginMode) {
        // Sign In Flow
        try {
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
          });
        } catch (authErr) {
          console.log('Supabase Auth sign-in fallback:', authErr);
        }
        
        // Fetch or create profile record
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (!prof) {
          await supabase
            .from('profiles')
            .upsert(
              {
                email: email.trim().toLowerCase(),
                full_name: fullName.trim() || email.split('@')[0],
                saved_addresses: []
              },
              { onConflict: 'email' }
            );
        } else {
          if (prof.full_name) setFullName(prof.full_name);
          setSavedAddresses(prof.saved_addresses || []);
        }

        setIsLoggedIn(true);
      } else {
        // Create Account / Sign Up Flow
        try {
          await supabase.auth.signUp({
            email: email.trim(),
            password: password
          });
        } catch (sErr) {
          console.log('Supabase Auth signup notice:', sErr);
        }

        // Guarantee entry in Supabase profiles database table
        const { error: insErr } = await supabase
          .from('profiles')
          .upsert(
            {
              email: email.trim().toLowerCase(),
              full_name: fullName.trim() || email.split('@')[0],
              saved_addresses: []
            },
            { onConflict: 'email' }
          );

        if (insErr && insErr.code !== '23505') {
          console.log('Profile insert notice:', insErr.message);
        }

        setSavedAddresses([]);
        setIsLoggedIn(true); // Instant login on sign-up!
      }
    } catch (err: any) {
      setAuthError('Authentication error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.preloaderContainer}>
        <StatusBar style="light" />
        <View style={styles.glowOverlay} />
        
        <View style={styles.loaderWrapper}>
          <Text style={styles.preloaderTitle}>SRR FARMS</Text>
          <View style={styles.goldDivider} />
          <Text style={[styles.preloaderSub, { letterSpacing: 3, color: '#C5A059' }]}>Vedic Bilona Churning</Text>
          
          <ActivityIndicator size="small" color="#C5A059" style={{ marginTop: 32 }} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <Text style={styles.logo}>SRR<Text style={{ color: '#C5A059' }}>.</Text></Text>
        <TouchableOpacity style={styles.cartBtn} onPress={() => setIsCartOpen(true)}>
          <ShoppingCart size={20} color="#E2E4E9" />
          {totalItemsCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItemsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* ================= TAB ROUTING INTERFACES ================= */}

        {/* 1. HOME TAB */}
        {currentTab === 'home' && (
          <View>
            {/* Full-bleed appropriate luxury ghee background hero */}
            <View style={styles.heroSection}>
              <Image 
                source={require('./assets/srrapp.png')} 
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.heroOverlay}>
                <View style={styles.heroTextCard}>
                  <View style={styles.badgeRow}>
                    <Flame size={12} color="#C5A059" />
                    <Text style={styles.heroTag}>Wood-fired Clarification</Text>
                  </View>
                  <Text style={styles.heroTitle}>Premium A2 Bilona Ghee</Text>
                  <Text style={styles.heroDesc}>Pure grass-fed Gir cow ghee, hand-churned in clay pots and clarified on fire wood.</Text>
                  
                  <View style={styles.heroBtnRow}>
                    <TouchableOpacity 
                      style={styles.watchFilmBtn} 
                      onPress={() => setIsVideoOpen(true)}
                    >
                      <Play size={12} color="#05070B" fill="#05070B" />
                      <Text style={styles.watchFilmText}>Watch Film</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Direct Harvest Quick shop */}
            <View style={styles.shopSection}>
              <Text style={styles.sectionTag}>Direct Harvest</Text>
              <Text style={styles.sectionTitle}>Select Volume</Text>

              <View style={styles.toggleContainer}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, purchaseType === 'onetime' && styles.toggleBtnActive]}
                  onPress={() => setPurchaseType('onetime')}
                >
                  <Text style={[styles.toggleText, purchaseType === 'onetime' && styles.toggleTextActive]}>One-time</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, purchaseType === 'subscribe' && styles.toggleBtnActive]}
                  onPress={() => setPurchaseType('subscribe')}
                >
                  <Text style={[styles.toggleText, purchaseType === 'subscribe' && styles.toggleTextActive]}>Subscribe & Save 10%</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.volBtnRow}>
                {volumes.map((v) => (
                  <TouchableOpacity 
                    key={v.name}
                    style={[styles.volBtn, selectedVolume === v.name && styles.volBtnActive]}
                    onPress={() => setSelectedVolume(v.name)}
                  >
                    <Text style={[styles.volBtnLabel, selectedVolume === v.name && styles.volLabelActive]}>{v.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.priceCard}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>
                    ₹{(purchaseType === 'subscribe' 
                      ? Math.floor(
                          (selectedVolume === '500ml' ? 1299 : selectedVolume === '1 Liter' ? 2499 : 11999) * 0.9
                        ) 
                      : (selectedVolume === '500ml' ? 1299 : selectedVolume === '1 Liter' ? 2499 : 11999)
                    ).toLocaleString()}
                  </Text>
                  {purchaseType === 'subscribe' && (
                    <Text style={styles.strikePrice}>
                      {volumes.find(v => v.name === selectedVolume)?.price}
                    </Text>
                  )}
                </View>
                <Text style={styles.compShipping}>Complimentary Premium Shipping</Text>
                <Text style={styles.volDesc}>{volumes.find(v => v.name === selectedVolume)?.desc}</Text>

                <View style={styles.ctaRow}>
                  <TouchableOpacity 
                    style={styles.addToCartBtn}
                    onPress={() => handleAddToCart(
                      'Pure A2 Desi Cow Ghee', 
                      selectedVolume, 
                      selectedVolume === '500ml' ? 1299 : selectedVolume === '1 Liter' ? 2499 : 11999
                    )}
                  >
                    <Text style={styles.addToCartText}>Add to Cart</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.waDirectBtn}
                    onPress={() => Linking.openURL(getWhatsAppMessage(selectedVolume, purchaseType === 'subscribe'))}
                  >
                    <Text style={styles.waDirectText}>WhatsApp Order</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Batch tracker lookup */}
            <View style={styles.auditSection}>
              <Text style={styles.sectionTag}>Organic Trust Audit</Text>
              <Text style={styles.sectionTitle}>Trace Your Harvest</Text>
              <Text style={styles.auditHelp}>Enter batch number (78, 77, 76) printed on back label to trace cow feed and lab acidity report.</Text>
              
              <View style={styles.searchRow}>
                <TextInput 
                  style={styles.searchInput}
                  value={batchNo}
                  onChangeText={setBatchNo}
                  placeholder="Enter batch # (e.g. 78)"
                  placeholderTextColor="rgba(226, 228, 233, 0.2)"
                />
                <TouchableOpacity 
                  style={styles.searchBtn}
                  onPress={async () => {
                    const clean = batchNo.trim();
                    if (!clean) return;
                    setBatchReport('loading');
                    try {
                      const { data, error } = await supabase
                        .from('batches')
                        .select('*')
                        .eq('batch_no', clean)
                        .maybeSingle();

                      if (error) throw error;
                      if (data) {
                        setBatchReport({
                          batch: data.batch_no,
                          milking: data.milking_date,
                          churn: data.churn_date,
                          pasture: data.pasture_origin,
                          acidity: data.acidity,
                          cows: data.cow_shelter
                        });
                      } else {
                        setBatchReport('error');
                      }
                    } catch (e) {
                      console.error(e);
                      setBatchReport('error');
                    }
                  }}
                >
                  <Text style={styles.searchBtnText}>Audit</Text>
                </TouchableOpacity>
              </View>

              {batchReport === 'loading' && (
                <View style={[styles.reportCard, { alignItems: 'center', justifyContent: 'center', padding: 20 }]}>
                  <ActivityIndicator size="small" color="#C5A059" />
                  <Text style={{ color: 'rgba(226, 228, 233, 0.4)', fontSize: 11, marginTop: 8 }}>Querying laboratory database...</Text>
                </View>
              )}

              {batchReport === 'error' && (
                <View style={styles.reportErrorCard}>
                  <Text style={styles.reportErrorText}>Batch not found in Supabase. Check the code on the back label.</Text>
                </View>
              )}

              {batchReport && batchReport !== 'error' && (
                <View style={styles.reportCard}>
                  <Text style={styles.reportTitle}>Batch #{batchReport.batch} Verified Report</Text>
                  <View style={styles.reportGrid}>
                    <View style={styles.reportCol}>
                      <Text style={styles.reportLabel}>Milking Date</Text>
                      <Text style={styles.reportVal}>{batchReport.milking}</Text>
                    </View>
                    <View style={styles.reportCol}>
                      <Text style={styles.reportLabel}>Churn Date</Text>
                      <Text style={styles.reportVal}>{batchReport.churn}</Text>
                    </View>
                    <View style={styles.reportCol}>
                      <Text style={styles.reportLabel}>Pasture Sourced</Text>
                      <Text style={styles.reportVal}>{batchReport.pasture}</Text>
                    </View>
                    <View style={styles.reportCol}>
                      <Text style={styles.reportLabel}>Cows Breed</Text>
                      <Text style={styles.reportVal}>{batchReport.cows}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Footer team signature */}
            <View style={styles.footerTeam}>
              <Text style={styles.footerTeamText}>SRR Farms Heritage Churning Hubs</Text>
              <Text style={styles.teamSignature}>Team SRR Farms</Text>
              <Text style={styles.teamTitle}>Heritage Custodians</Text>
              <Text style={[styles.teamTitle, { color: '#C5A059', marginTop: 8, fontWeight: 'bold' }]}>
                Developed by Sathish Dusharla
              </Text>
            </View>
          </View>
        )}

        {/* 2. SHOP TAB */}
        {currentTab === 'shop' && (
          <View style={{ padding: 24 }}>
            <Text style={styles.sectionTag}>Golden Harvest</Text>
            <Text style={styles.sectionTitle}>Ghee Collection</Text>

            <View style={{ gap: 20 }}>
              {products.map((product) => (
                <TouchableOpacity 
                  key={product.id} 
                  style={styles.productItemCard}
                  onPress={() => setSelectedProduct(product)}
                >
                  <Image source={{ uri: product.image }} style={styles.productCardImg} />
                  <View style={styles.productCardDetails}>
                    <Text style={styles.productCardTitle}>{product.name}</Text>
                    <Text style={styles.productCardVol}>{product.volume}</Text>
                    <Text style={styles.productCardDesc} numberOfLines={2}>{product.desc}</Text>
                    <View style={styles.productCardFooter}>
                      <Text style={styles.productCardPrice}>{product.price}</Text>
                      <View style={styles.productCardActionBtn}>
                        <ArrowRight size={14} color="#C5A059" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 3. PURITY TAB */}
        {currentTab === 'purity' && (
          <View style={{ padding: 24 }}>
            <Text style={styles.sectionTag}>Authenticated Quality</Text>
            <Text style={styles.sectionTitle}>Certifications</Text>

            <View style={{ gap: 16, marginBottom: 32 }}>
              {certificates.map((cert) => (
                <View key={cert.id} style={styles.certCardFull}>
                  <View style={styles.certIconRow}>
                    <Award size={20} color="#C5A059" />
                    <View style={styles.verifiedMiniBadge}>
                      <Text style={styles.verifiedMiniText}>Verified Purity</Text>
                    </View>
                  </View>
                  <Text style={styles.certTitleFull}>{cert.title}</Text>
                  <Text style={styles.certAuthFull}>{cert.authority}</Text>
                  <Text style={styles.certDescFull}>{cert.desc}</Text>
                  <View style={styles.certNoRow}>
                    <Text style={styles.certNo}>{cert.number}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Test limits comparison */}
            <View style={styles.reportCard}>
              <Text style={[styles.reportTitle, { marginBottom: 12 }]}>NABL Test Results</Text>
              {parameters.map((p, i) => (
                <View key={i} style={styles.testParamRow}>
                  <Text style={styles.testParamName}>{p.name}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.testParamValue}>{p.ourValue}</Text>
                    <Text style={styles.testParamLimit}>Limit: {p.standard}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 4. ACCOUNT TAB */}
        {currentTab === 'account' && (
          <View style={{ padding: 24 }}>
            {!isLoggedIn ? (
              <View style={styles.authWrapper}>
                <Text style={styles.sectionTag}>Security Portal</Text>
                <Text style={styles.sectionTitle}>{isLoginMode ? 'Sign In' : 'Create Account'}</Text>
                
                {authError ? <Text style={styles.authErrorLabel}>{authError}</Text> : null}

                <View style={styles.inputContainer}>
                  <User size={16} color="rgba(226,228,233,0.3)" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.authInput}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Full Name (Optional for Sign In)"
                    placeholderTextColor="rgba(226,228,233,0.25)"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Mail size={16} color="rgba(226,228,233,0.3)" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.authInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email Address"
                    placeholderTextColor="rgba(226,228,233,0.25)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Lock size={16} color="rgba(226,228,233,0.3)" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.authInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="rgba(226,228,233,0.25)"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    {showPassword ? <EyeOff size={16} color="rgba(226,228,233,0.4)" /> : <Eye size={16} color="rgba(226,228,233,0.4)" />}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.authSubmitBtn} onPress={handleAuthSubmit}>
                  <Text style={styles.authSubmitText}>{isLoginMode ? 'Sign In' : 'Create Account'}</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.authDivider}>
                  <View style={styles.authDividerLine} />
                  <Text style={styles.authDividerText}>or continue with</Text>
                  <View style={styles.authDividerLine} />
                </View>

                {/* Google Sign in button */}
                <TouchableOpacity style={styles.googleAuthBtn} onPress={handleGoogleSignIn}>
                  <Image source={{ uri: 'https://img.icons8.com/color/48/google-logo.png' }} style={styles.googleIcon} />
                  <Text style={styles.googleAuthText}>Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modeToggleBtn} onPress={() => setIsLoginMode(!isLoginMode)}>
                  <Text style={styles.modeToggleText}>
                    {isLoginMode ? 'New to SRR Farms? Register' : 'Already have an account? Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.profileWrapper}>
                <Text style={styles.sectionTag}>Customer Console</Text>
                <Text style={styles.sectionTitle}>Dashboard</Text>

                <View style={styles.profileCard}>
                  <View style={styles.profileHeader}>
                    <Text style={styles.profileName}>{fullName || (email ? email.split('@')[0] : 'Valued Customer')}</Text>
                    <Text style={styles.profileEmail}>{email || 'user@google.com'}</Text>
                  </View>
                  <View style={styles.loyaltyBadge}>
                    <Text style={styles.loyaltyBadgeText}>👑 Heritage Tier member</Text>
                  </View>
                </View>

                {/* Saved Addresses */}
                <Text style={styles.profileSubHeading}>Saved Addresses</Text>
                {savedAddresses.length === 0 ? (
                  <View style={[styles.subCard, { padding: 16 }]}>
                    <Text style={{ color: 'rgba(226, 228, 233, 0.4)', fontSize: 11 }}>
                      No saved addresses yet. Order items to save address for 1-click checkout.
                    </Text>
                  </View>
                ) : (
                  savedAddresses.map((addr, idx) => (
                    <View key={idx} style={[styles.subCard, { padding: 14, marginBottom: 8 }]}>
                      <Text style={{ color: 'rgba(226, 228, 233, 0.8)', fontSize: 11 }}>
                        📍 {addr}
                      </Text>
                    </View>
                  ))
                )}

                {/* Live Order History from Supabase */}
                <Text style={styles.profileSubHeading}>Your Orders & Auto-Ships</Text>
                
                {loadingOrders ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#C5A059" />
                    <Text style={{ color: 'rgba(226, 228, 233, 0.4)', fontSize: 10, marginTop: 8 }}>Syncing order history...</Text>
                  </View>
                ) : userOrders.length === 0 ? (
                  <View style={[styles.subCard, { alignItems: 'center', padding: 24 }]}>
                    <Text style={{ color: 'rgba(226, 228, 233, 0.4)', fontSize: 11, textAlign: 'center' }}>
                      No order reports found. Place a new one in the shop!
                    </Text>
                  </View>
                ) : (
                  userOrders.map((ord: any) => (
                    <View key={ord.id} style={[styles.subCard, { gap: 12, marginBottom: 14, padding: 14 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                          Order ID: {ord.id.slice(0, 8)}
                        </Text>
                        <View style={{
                          backgroundColor: ord.status === 'Pending' ? 'rgba(245,158,11,0.1)' :
                                           ord.status === 'Processing' ? 'rgba(14,165,233,0.1)' :
                                           ord.status === 'Shipped' ? 'rgba(10,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          borderColor: ord.status === 'Pending' ? 'rgba(245,158,11,0.2)' :
                                       ord.status === 'Processing' ? 'rgba(14,165,233,0.2)' :
                                       ord.status === 'Shipped' ? 'rgba(10,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                          borderWidth: 1,
                          borderRadius: 12,
                          paddingHorizontal: 8,
                          paddingVertical: 2
                        }}>
                          <Text style={{
                            color: ord.status === 'Pending' ? '#f59e0b' :
                                   ord.status === 'Processing' ? '#0ea5e9' :
                                   ord.status === 'Shipped' ? '#10b981' : '#ef4444',
                            fontSize: 9,
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}>
                            {ord.status}
                          </Text>
                        </View>
                      </View>

                      <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(226, 228, 233, 0.05)', paddingTop: 8, marginTop: 4 }}>
                        {ord.items?.map((it: any, idx: number) => (
                          <Text key={idx} style={{ color: 'rgba(226, 228, 233, 0.7)', fontSize: 11, marginBottom: 2 }}>
                            • {it.name} ({it.volume}) x {it.qty}
                          </Text>
                        ))}
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <Text style={{ color: 'rgba(226, 228, 233, 0.35)', fontSize: 10 }}>
                          {ord.purchase_type === 'subscribe' ? 'Subscription Auto-ship' : 'One-time shipment'}
                        </Text>
                        <Text style={{ color: '#C5A059', fontSize: 12, fontWeight: 'bold' }}>
                          ₹{ord.total_amount ? ord.total_amount.toLocaleString() : '0'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}

                {/* Developer Credit */}
                <View style={{ marginTop: 24, marginBottom: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#C5A059', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 }}>
                    Developed by Sathish Dusharla
                  </Text>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={() => setIsLoggedIn(false)}>
                  <LogOut size={16} color="#ef4444" />
                  <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* ================= BOTTOM TAB NAVIGATION ================= */}
      <View style={styles.bottomTab}>
        <TouchableOpacity 
          style={[styles.tabItem, currentTab === 'home' && styles.tabItemActive]}
          onPress={() => setCurrentTab('home')}
        >
          <HomeIcon size={18} color={currentTab === 'home' ? '#C5A059' : 'rgba(226,228,233,0.4)'} />
          <Text style={[styles.tabLabel, currentTab === 'home' && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, currentTab === 'shop' && styles.tabItemActive]}
          onPress={() => setCurrentTab('shop')}
        >
          <ShoppingBag size={18} color={currentTab === 'shop' ? '#C5A059' : 'rgba(226,228,233,0.4)'} />
          <Text style={[styles.tabLabel, currentTab === 'shop' && styles.tabLabelActive]}>Shop</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, currentTab === 'purity' && styles.tabItemActive]}
          onPress={() => setCurrentTab('purity')}
        >
          <Award size={18} color={currentTab === 'purity' ? '#C5A059' : 'rgba(226,228,233,0.4)'} />
          <Text style={[styles.tabLabel, currentTab === 'purity' && styles.tabLabelActive]}>Purity</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, currentTab === 'account' && styles.tabItemActive]}
          onPress={() => setCurrentTab('account')}
        >
          <User size={18} color={currentTab === 'account' ? '#C5A059' : 'rgba(226,228,233,0.4)'} />
          <Text style={[styles.tabLabel, currentTab === 'account' && styles.tabLabelActive]}>Account</Text>
        </TouchableOpacity>
      </View>

      {/* ================= PRODUCT DETAILS SPEC MODAL ================= */}
      <AnimateModal visible={selectedProduct !== null} onClose={() => setSelectedProduct(null)}>
        {selectedProduct && (
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <ScrollView style={{ padding: 24 }}>
              <Image source={{ uri: selectedProduct.image }} style={styles.modalSpecImg} />
              <Text style={styles.modalSpecTitle}>{selectedProduct.name}</Text>
              <Text style={styles.modalSpecVol}>{selectedProduct.volume}</Text>
              <Text style={styles.modalSpecDesc}>{selectedProduct.desc}</Text>

              <View style={styles.specMetricRow}>
                <View style={styles.specMetric}>
                  <Text style={styles.specMetricLabel}>Calorific Value</Text>
                  <Text style={styles.specMetricVal}>898 kcal</Text>
                </View>
                <View style={styles.specMetric}>
                  <Text style={styles.specMetricLabel}>Casein Source</Text>
                  <Text style={styles.specMetricVal}>Pure A2 Only</Text>
                </View>
              </View>

              <View style={styles.certCheckCard}>
                <CheckCircle2 size={16} color="#34d399" />
                <Text style={styles.certCheckText}>100% Free of Adulterants, Vegetable Oils, or Preservatives.</Text>
              </View>
            </ScrollView>

            <View style={styles.modalSpecFooter}>
              <View>
                <Text style={styles.modalSpecFooterLabel}>Total Price</Text>
                <Text style={styles.modalSpecFooterPrice}>{selectedProduct.price}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity 
                  style={styles.modalSpecAddBtn}
                  onPress={() => {
                    const basePrice = selectedProduct.volume === '500ml' ? 1299 : selectedProduct.volume === '1 Liter' ? 2499 : 11999;
                    handleAddToCart('Pure A2 Desi Cow Ghee', selectedProduct.volume, basePrice);
                    setSelectedProduct(null);
                  }}
                >
                  <Text style={styles.modalSpecAddBtnText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalSpecWaBtn}
                  onPress={() => {
                    setSelectedProduct(null);
                    Linking.openURL(getWhatsAppMessage(selectedProduct.volume, false));
                  }}
                >
                  <Text style={styles.modalSpecWaBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </AnimateModal>



      {/* ================= VIDEO MODAL ================= */}
      <Modal visible={isVideoOpen} animationType="fade" transparent>
        <View style={styles.videoBackdrop}>
          <View style={styles.videoContainer}>
            <View style={styles.videoHeader}>
              <Text style={styles.videoTitle}>SRR Farms Heritage Film</Text>
              <TouchableOpacity onPress={() => setIsVideoOpen(false)} style={{ padding: 8 }}>
                <X size={20} color="#E2E4E9" />
              </TouchableOpacity>
            </View>
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoText}>[ Heritage Video Simulates Here ]</Text>
              <Text style={styles.videoSubText}>Simulating clay pots churning by hand...</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= CART SLIDE DRAWER SHEET ================= */}
      <Modal visible={isCartOpen} animationType="slide" transparent>
        <View style={styles.cartBackdrop}>
          <View style={styles.cartContainer}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Harvest Cart</Text>
              <TouchableOpacity onPress={() => setIsCartOpen(false)} style={{ padding: 8 }}>
                <X size={20} color="#E2E4E9" />
              </TouchableOpacity>
            </View>

            {cartItems.length === 0 ? (
              <View style={styles.emptyCartBody}>
                <Text style={styles.emptyCartText}>Your harvest cart is empty.</Text>
              </View>
            ) : (
              <View style={styles.cartBody}>
                <ScrollView style={styles.cartItemsScroll}>
                  {cartItems.map((item) => (
                    <View key={item.volume} style={styles.cartItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemVol}>{item.volume}</Text>
                        <Text style={styles.cartItemPrice}>₹{(item.price * item.qty).toLocaleString()}</Text>
                      </View>
                      
                      <View style={styles.cartQtyRow}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.volume, -1)}>
                          <Minus size={12} color="#E2E4E9" />
                        </TouchableOpacity>
                        <Text style={styles.qtyVal}>{item.qty}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.volume, 1)}>
                          <Plus size={12} color="#E2E4E9" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.cartFooter}>
                  <View style={styles.shippingBanner}>
                    <Text style={styles.shippingBannerText}>🎉 Free Complimentary Premium Shipping qualified</Text>
                  </View>

                  <View style={styles.subtotalRow}>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalVal}>₹{cartSubtotal.toLocaleString()}</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.checkoutBtn}
                    onPress={() => {
                      if (!isLoggedIn) {
                        setIsCartOpen(false);
                        setCurrentTab('account');
                        alert('Please Sign In or Create an Account to proceed with your order.');
                        return;
                      }
                      setIsCartOpen(false);
                      setShippingAddress('');
                      setShippingPhone('');
                      setCheckoutStatus('');
                      setIsCheckoutModalOpen(true);
                    }}
                  >
                    <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.cartWaBtn}
                    onPress={() => Linking.openURL(getWhatsAppMessage())}
                  >
                    <Text style={styles.cartWaText}>Order via WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ================= SUPABASE CHECKOUT MODAL ================= */}
      <Modal visible={isCheckoutModalOpen} animationType="slide" transparent>
        <View style={styles.cartBackdrop}>
          <View style={[styles.cartContainer, { height: SCREEN_HEIGHT * 0.7 }]}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Delivery Address</Text>
              <TouchableOpacity onPress={() => setIsCheckoutModalOpen(false)} style={{ padding: 8 }}>
                <X size={20} color="#E2E4E9" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cartItemsScroll}>
              <Text style={{ fontSize: 10, color: '#C5A059', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
                Confirm shipping details
              </Text>

              {checkoutStatus ? (
                <View style={{ padding: 12, backgroundColor: 'rgba(197, 160, 89, 0.05)', borderWidth: 1, borderColor: 'rgba(197, 160, 89, 0.15)', borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ color: '#C5A059', fontSize: 11, textAlign: 'center' }}>{checkoutStatus}</Text>
                </View>
              ) : null}

              <View style={{ gap: 16, marginBottom: 24 }}>
                {savedAddresses.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 10, color: 'rgba(226, 228, 233, 0.45)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 }}>Use Saved Address</Text>
                    <View style={{ gap: 8 }}>
                      {savedAddresses.map((addr, idx) => (
                        <TouchableOpacity 
                          key={idx}
                          style={{ padding: 12, backgroundColor: shippingAddress === addr ? 'rgba(197, 160, 89, 0.12)' : '#05070B', borderWidth: 1, borderColor: shippingAddress === addr ? '#C5A059' : 'rgba(226, 228, 233, 0.08)', borderRadius: 8 }}
                          onPress={() => setShippingAddress(addr)}
                        >
                          <Text style={{ color: '#fff', fontSize: 11, lineHeight: 16 }}>{addr}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View>
                  <Text style={{ fontSize: 10, color: 'rgba(226, 228, 233, 0.45)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6 }}>Phone Number</Text>
                  <TextInput
                    style={{ backgroundColor: '#05070B', borderColor: 'rgba(226, 228, 233, 0.12)', borderWidth: 1, borderRadius: 8, color: '#fff', fontSize: 13, paddingHorizontal: 12, paddingVertical: 10 }}
                    value={shippingPhone}
                    onChangeText={setShippingPhone}
                    placeholder="e.g. +91 99999 99999"
                    placeholderTextColor="rgba(226, 228, 233, 0.2)"
                    keyboardType="phone-pad"
                  />
                </View>

                <View>
                  <Text style={{ fontSize: 10, color: 'rgba(226, 228, 233, 0.45)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6 }}>Full Shipping Address</Text>
                  <TextInput
                    style={{ backgroundColor: '#05070B', borderColor: 'rgba(226, 228, 233, 0.12)', borderWidth: 1, borderRadius: 8, color: '#fff', fontSize: 13, paddingHorizontal: 12, paddingVertical: 10, height: 80 }}
                    multiline
                    value={shippingAddress}
                    onChangeText={setShippingAddress}
                    placeholder="Enter street name, area, city, and pin code..."
                    placeholderTextColor="rgba(226, 228, 233, 0.2)"
                  />
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}
                    onPress={() => setSaveToProfile(!saveToProfile)}
                  >
                    <View style={{ width: 16, height: 16, borderWidth: 1, borderColor: '#C5A059', borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: saveToProfile ? '#C5A059' : 'transparent' }}>
                      {saveToProfile && <Text style={{ color: '#05070B', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                    </View>
                    <Text style={{ color: 'rgba(226, 228, 233, 0.6)', fontSize: 11 }}>Save this address to my profile</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(226, 228, 233, 0.05)', pt: 16, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ color: 'rgba(226, 228, 233, 0.4)', fontSize: 11 }}>Total Order Value</Text>
                  <Text style={{ color: '#C5A059', fontSize: 18, fontWeight: 'bold' }}>₹{cartSubtotal.toLocaleString()}</Text>
                </View>

                <TouchableOpacity
                  style={styles.checkoutBtn}
                  onPress={async () => {
                    if (!shippingPhone || !shippingAddress) {
                      setCheckoutStatus('Please specify shipping address and contact phone.');
                      return;
                    }
                    try {
                      setCheckoutStatus('Submitting order to Supabase...');
                      
                      // Save new address to profile if checked
                      const trimmedAddr = shippingAddress.trim();
                      if (saveToProfile && !savedAddresses.includes(trimmedAddr)) {
                        const updated = [...savedAddresses, trimmedAddr];
                        await supabase
                          .from('profiles')
                          .update({ saved_addresses: updated })
                          .eq('email', email.trim().toLowerCase());
                        setSavedAddresses(updated);
                      }

                      const { error } = await supabase
                        .from('orders')
                        .insert({
                          user_email: email.trim().toLowerCase(),
                          items: cartItems,
                          total_amount: cartSubtotal,
                          shipping_address: trimmedAddr,
                          phone: shippingPhone.trim(),
                          purchase_type: purchaseType,
                          status: 'Pending'
                        });

                      if (error) throw error;

                      setCheckoutStatus('Success! Order placed successfully.');
                      setCartItems([]);
                      setTimeout(() => {
                        setIsCheckoutModalOpen(false);
                        setCurrentTab('account');
                      }, 1000);
                    } catch (err: any) {
                      setCheckoutStatus('Checkout error: ' + err.message);
                    }
                  }}
                >
                  <Text style={styles.checkoutBtnText}>Confirm Order & Pay</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Helper wrapper for slide modals
function AnimateModal({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Specifications</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <X size={20} color="#E2E4E9" />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#05070B',
  },
  preloaderContainer: {
    flex: 1,
    backgroundColor: '#05070B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOverlay: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: (SCREEN_WIDTH * 0.8) / 2,
    backgroundColor: 'rgba(197, 160, 89, 0.08)',
    blurRadius: 90,
  },
  loaderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  preloaderTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: 8,
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  goldDivider: {
    width: 48,
    height: 1,
    backgroundColor: '#C5A059',
    marginBottom: 20,
  },
  preloaderSub: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    color: 'rgba(226, 228, 233, 0.6)',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 228, 233, 0.05)',
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  cartBtn: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#C5A059',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#05070B',
  },
  scrollContent: {
    paddingBottom: 84,
  },
  heroSection: {
    height: 380,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.15)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    padding: 16,
    justifyContent: 'flex-end',
  },
  heroTextCard: {
    backgroundColor: 'rgba(5, 7, 11, 0.82)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  heroTag: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    color: '#C5A059',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 12,
    color: 'rgba(226, 228, 233, 0.75)',
    fontWeight: '300',
    lineHeight: 18,
    marginBottom: 16,
  },
  heroBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  watchFilmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C5A059',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  watchFilmText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#05070B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  doshaQuizLink: {
    paddingVertical: 8,
  },
  doshaLinkText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#C5A059',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shopSection: {
    padding: 24,
  },
  sectionTag: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 3,
    color: '#C5A059',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(5, 7, 11, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.08)',
    borderRadius: 30,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#C5A059',
  },
  toggleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(226, 228, 233, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleTextActive: {
    color: '#05070B',
  },
  volBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  volBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(10, 14, 23, 0.2)',
  },
  volBtnActive: {
    borderColor: '#C5A059',
    backgroundColor: 'rgba(197, 160, 89, 0.05)',
  },
  volBtnLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(226, 228, 233, 0.5)',
  },
  volLabelActive: {
    color: '#ffffff',
  },
  priceCard: {
    backgroundColor: 'rgba(10, 14, 23, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.08)',
    borderRadius: 16,
    padding: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 8,
  },
  priceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#C5A059',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  strikePrice: {
    fontSize: 14,
    color: 'rgba(226, 228, 233, 0.3)',
    textDecorationLine: 'line-through',
  },
  compShipping: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(226, 228, 233, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  volDesc: {
    fontSize: 12,
    color: 'rgba(226, 228, 233, 0.7)',
    fontWeight: '300',
    lineHeight: 18,
    marginBottom: 24,
  },
  ctaRow: {
    flexDirection: 'column',
    gap: 12,
  },
  addToCartBtn: {
    backgroundColor: '#C5A059',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  addToCartText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#05070B',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  waDirectBtn: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  waDirectText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  auditSection: {
    padding: 24,
    backgroundColor: 'rgba(10, 14, 23, 0.2)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 228, 233, 0.05)',
  },
  auditHelp: {
    fontSize: 12,
    color: 'rgba(226, 228, 233, 0.5)',
    fontWeight: '300',
    lineHeight: 18,
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    height: 52,
    backgroundColor: '#0A0E17',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#C5A059',
    paddingHorizontal: 24,
    justifyContent: 'center',
    borderRadius: 12,
  },
  searchBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#05070B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reportErrorCard: {
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    marginBottom: 10,
  },
  reportErrorText: {
    fontSize: 12,
    color: '#f87171',
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: 'rgba(10, 14, 23, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.25)',
    borderRadius: 16,
    padding: 20,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 16,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  reportCol: {
    width: '46%',
  },
  reportLabel: {
    fontSize: 10,
    color: 'rgba(226, 228, 233, 0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  reportVal: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  certsSection: {
    paddingVertical: 24,
    paddingLeft: 24,
  },
  certsScroller: {
    paddingRight: 24,
    gap: 16,
    marginTop: 16,
  },
  certCard: {
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: 'rgba(10, 14, 23, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.08)',
    borderRadius: 16,
    padding: 20,
  },
  certIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  verifiedMiniBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedMiniText: {
    fontSize: 8,
    color: '#34d399',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  certTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 2,
  },
  certAuth: {
    fontSize: 9,
    color: 'rgba(226, 228, 233, 0.4)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  certDesc: {
    fontSize: 11,
    color: 'rgba(226, 228, 233, 0.6)',
    fontWeight: '300',
    lineHeight: 16,
    marginBottom: 16,
  },
  certFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 228, 233, 0.05)',
    paddingTop: 12,
  },
  certNo: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#C5A059',
  },
  footerTeam: {
    padding: 48,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 228, 233, 0.05)',
  },
  footerTeamText: {
    fontSize: 11,
    color: 'rgba(226, 228, 233, 0.35)',
    letterSpacing: 1,
    marginBottom: 16,
  },
  teamSignature: {
    fontSize: 20,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#C5A059',
    marginBottom: 4,
  },
  teamTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'rgba(226, 228, 233, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  bottomTab: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#0A0E17',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 228, 233, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#C5A059',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(226, 228, 233, 0.4)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: '#C5A059',
  },
  productItemCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 14, 23, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.08)',
    borderRadius: 16,
    overflow: 'hidden',
    height: 140,
  },
  productCardImg: {
    width: 120,
    height: '100%',
  },
  productCardDetails: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  productCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  productCardVol: {
    fontSize: 10,
    color: 'rgba(226, 228, 233, 0.4)',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  productCardDesc: {
    fontSize: 11,
    color: 'rgba(226, 228, 233, 0.5)',
    fontWeight: '300',
    lineHeight: 15,
  },
  productCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productCardPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C5A059',
  },
  productCardActionBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certCardFull: {
    backgroundColor: 'rgba(10, 14, 23, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.08)',
    borderRadius: 16,
    padding: 20,
  },
  certTitleFull: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 4,
  },
  certAuthFull: {
    fontSize: 10,
    color: 'rgba(226, 228, 233, 0.4)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  certDescFull: {
    fontSize: 12,
    color: 'rgba(226, 228, 233, 0.65)',
    fontWeight: '300',
    lineHeight: 18,
    marginBottom: 16,
  },
  certNoRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 228, 233, 0.05)',
    paddingTop: 12,
  },
  testParamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 228, 233, 0.05)',
    paddingVertical: 12,
  },
  testParamName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
  },
  testParamValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#C5A059',
  },
  testParamLimit: {
    fontSize: 10,
    color: 'rgba(226, 228, 233, 0.35)',
    marginTop: 2,
  },
  authWrapper: {
    backgroundColor: 'rgba(10, 14, 23, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.08)',
    borderRadius: 20,
    padding: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#05070B',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.12)',
    borderRadius: 12,
    height: 54,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  authInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 8,
  },
  authSubmitBtn: {
    backgroundColor: '#C5A059',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  authSubmitText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#05070B',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  authDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(226, 228, 233, 0.08)',
  },
  authDividerText: {
    fontSize: 9,
    color: 'rgba(226, 228, 233, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
  },
  googleAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.12)',
    height: 54,
    borderRadius: 27,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleAuthText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  modeToggleBtn: {
    alignItems: 'center',
    marginTop: 24,
  },
  modeToggleText: {
    fontSize: 11,
    color: '#C5A059',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  authErrorLabel: {
    color: '#f87171',
    fontSize: 11,
    marginBottom: 16,
    textAlign: 'center',
  },
  profileWrapper: {
    backgroundColor: 'rgba(10, 14, 23, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.08)',
    borderRadius: 20,
    padding: 24,
  },
  profileCard: {
    backgroundColor: '#05070B',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  profileHeader: {
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  profileEmail: {
    fontSize: 12,
    color: 'rgba(226, 228, 233, 0.4)',
    marginTop: 2,
  },
  loyaltyBadge: {
    backgroundColor: 'rgba(197, 160, 89, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  loyaltyBadgeText: {
    fontSize: 10,
    color: '#C5A059',
    fontWeight: 'bold',
  },
  profileSubHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  subCard: {
    backgroundColor: '#05070B',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  subProduct: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subSchedule: {
    fontSize: 11,
    color: 'rgba(226, 228, 233, 0.4)',
    marginTop: 4,
    marginBottom: 12,
  },
  subStatusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  subStatusText: {
    fontSize: 9,
    color: '#34d399',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    height: 52,
    borderRadius: 26,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ef4444',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalSpecImg: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 20,
  },
  modalSpecTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  modalSpecVol: {
    fontSize: 11,
    color: 'rgba(226, 228, 233, 0.4)',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginVertical: 4,
  },
  modalSpecDesc: {
    fontSize: 13,
    color: 'rgba(226, 228, 233, 0.65)',
    fontWeight: '300',
    lineHeight: 20,
    marginBottom: 20,
  },
  specMetricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  specMetric: {
    flex: 1,
    backgroundColor: '#05070B',
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.08)',
    borderRadius: 12,
    padding: 14,
  },
  specMetricLabel: {
    fontSize: 9,
    color: 'rgba(226, 228, 233, 0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  specMetricVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#C5A059',
  },
  certCheckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  certCheckText: {
    flex: 1,
    fontSize: 11,
    color: '#a7f3d0',
    fontWeight: '300',
    lineHeight: 16,
  },
  modalSpecFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 228, 233, 0.08)',
    backgroundColor: '#05070B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalSpecFooterLabel: {
    fontSize: 9,
    color: 'rgba(226, 228, 233, 0.4)',
    textTransform: 'uppercase',
  },
  modalSpecFooterPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#C5A059',
    marginTop: 2,
  },
  modalSpecAddBtn: {
    backgroundColor: '#C5A059',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    justifyContent: 'center',
  },
  modalSpecAddBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#05070B',
    textTransform: 'uppercase',
  },
  modalSpecWaBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    justifyContent: 'center',
  },
  modalSpecWaBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  modalContainer: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.85,
    backgroundColor: '#0A0E17',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.2)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 228, 233, 0.08)',
  },
  modalTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#C5A059',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  videoBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  videoContainer: {
    width: '90%',
    aspectRatio: 16 / 9,
    backgroundColor: '#05070B',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.25)',
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  videoTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#C5A059',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  videoSubText: {
    fontSize: 11,
    color: 'rgba(226, 228, 233, 0.4)',
    marginTop: 8,
  },
  cartBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  cartContainer: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.75,
    backgroundColor: '#0A0E17',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.08)',
    overflow: 'hidden',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 228, 233, 0.08)',
  },
  cartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  emptyCartBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCartText: {
    fontSize: 12,
    color: 'rgba(226, 228, 233, 0.4)',
  },
  cartBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cartItemsScroll: {
    flex: 1,
    padding: 24,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 228, 233, 0.05)',
    paddingBottom: 16,
    marginBottom: 16,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cartItemVol: {
    fontSize: 11,
    color: 'rgba(226, 228, 233, 0.4)',
    marginTop: 2,
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#C5A059',
    fontWeight: 'bold',
    marginTop: 4,
  },
  cartQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 228, 233, 0.15)',
    borderRadius: 20,
    padding: 4,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 228, 233, 0.05)',
  },
  qtyVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    width: 16,
    textAlign: 'center',
  },
  cartFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 228, 233, 0.08)',
    backgroundColor: '#05070B',
  },
  shippingBanner: {
    backgroundColor: 'rgba(197, 160, 89, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.15)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  shippingBannerText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#C5A059',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  subtotalLabel: {
    fontSize: 12,
    color: 'rgba(226, 228, 233, 0.4)',
    textTransform: 'uppercase',
  },
  subtotalVal: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#C5A059',
  },
  checkoutBtn: {
    backgroundColor: '#C5A059',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  checkoutBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#05070B',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  cartWaBtn: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  cartWaText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  }
});
