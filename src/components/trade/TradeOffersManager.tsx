import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Send,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import { CachedImage } from '../ui/CachedImage';

interface TradeOffer {
  id: string;
  initiator_steam_id: string;
  recipient_steam_id: string;
  status: string;
  offered_items: any[];
  requested_items: any[];
  total_offer_value: number;
  total_request_value: number;
  price_difference_percentage: number;
  notes: string;
  created_at: string;
  expires_at: string;
  accepted_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  trade_items: any[];
}

const TradeOffersManager: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();

  const [tradeOffers, setTradeOffers] = useState<TradeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed' | 'cancelled'>('all');
  const [selectedOffer, setSelectedOffer] = useState<TradeOffer | null>(null);

  useEffect(() => {
    if (user?.steamId) {
      fetchTradeOffers();
    }
  }, [user, filter]);

  const fetchTradeOffers = async () => {
    if (!user?.steamId) return;

    setLoading(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const response = await fetch(
        `${supabaseUrl}/functions/v1/trade-offers?steamId=${user.steamId}&filter=${filter}`,
        {
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTradeOffers(data.trade_offers || []);
      }
    } catch (error) {
      console.error('Failed to fetch trade offers:', error);
      addToast({
        type: 'error',
        title: 'Failed to Load',
        message: 'Could not load trade offers',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    if (!user?.steamId) return;

    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const response = await fetch(`${supabaseUrl}/functions/v1/trade-offers?action=accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trade_offer_id: offerId,
          recipient_steam_id: user.steamId,
        }),
      });

      if (response.ok) {
        addToast({
          type: 'success',
          title: 'Trade Accepted',
          message: 'The trade offer was accepted. Waiting for items to be sent.',
        });
        fetchTradeOffers();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept offer');
      }
    } catch (error) {
      console.error('Failed to accept offer:', error);
      addToast({
        type: 'error',
        title: 'Failed',
        message: error instanceof Error ? error.message : 'Failed to accept offer',
      });
    }
  };

  const handleCancelOffer = async (offerId: string, reason: string) => {
    if (!user?.steamId) return;

    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const response = await fetch(`${supabaseUrl}/functions/v1/trade-offers?action=cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trade_offer_id: offerId,
          user_steam_id: user.steamId,
          cancellation_reason: reason,
        }),
      });

      if (response.ok) {
        addToast({
          type: 'success',
          title: 'Trade Cancelled',
          message: 'The trade offer was cancelled',
        });
        fetchTradeOffers();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel offer');
      }
    } catch (error) {
      console.error('Failed to cancel offer:', error);
      addToast({
        type: 'error',
        title: 'Failed',
        message: error instanceof Error ? error.message : 'Failed to cancel offer',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'accepted':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'completed':
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'cancelled':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'expired':
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <Send className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const isRecipient = (offer: TradeOffer) => offer.recipient_steam_id === user?.steamId;

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700/50 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
        <p className="text-gray-400">Loading trade offers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Package className="w-7 h-7 text-purple-500 mr-3" />
          Trade Offers
        </h2>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchTradeOffers}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 bg-gray-800/50 p-1 rounded-lg">
        {['all', 'pending', 'accepted', 'completed', 'cancelled'].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption as any)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === filterOption
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
          </button>
        ))}
      </div>

      {/* Trade Offers List */}
      <div className="space-y-4">
        {tradeOffers.length === 0 ? (
          <div className="bg-gray-800/50 rounded-xl p-12 text-center border border-gray-700/50">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Trade Offers</h3>
            <p className="text-gray-500">
              {filter === 'all'
                ? 'You have no trade offers yet'
                : `No ${filter} trade offers`}
            </p>
          </div>
        ) : (
          tradeOffers.map((offer) => {
            const iAmRecipient = isRecipient(offer);
            const offerItems = offer.trade_items.filter((item) => item.side === 'offer');
            const requestItems = offer.trade_items.filter((item) => item.side === 'request');

            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden hover:border-purple-500/30 transition-all"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                            offer.status
                          )} flex items-center space-x-1`}
                        >
                          {getStatusIcon(offer.status)}
                          <span>{offer.status.toUpperCase()}</span>
                        </span>
                        <span className="text-gray-400 text-sm">
                          {new Date(offer.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-white font-medium">
                        {iAmRecipient ? (
                          <>
                            Trade offer from{' '}
                            <span className="text-purple-400">{offer.initiator_steam_id}</span>
                          </>
                        ) : (
                          <>
                            Trade offer to{' '}
                            <span className="text-blue-400">{offer.recipient_steam_id}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {offer.status === 'pending' && (
                      <div className="flex space-x-2">
                        {iAmRecipient && (
                          <>
                            <button
                              onClick={() => handleAcceptOffer(offer.id)}
                              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                handleCancelOffer(offer.id, 'Rejected by recipient')
                              }
                              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {!iAmRecipient && (
                          <button
                            onClick={() =>
                              handleCancelOffer(offer.id, 'Cancelled by sender')
                            }
                            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Items Preview */}
                  <div className="grid grid-cols-3 gap-4 items-center">
                    {/* Offering */}
                    <div>
                      <p className="text-gray-400 text-sm mb-2">
                        {iAmRecipient ? 'They offer' : 'You offer'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {offerItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="w-16 h-16 bg-gray-700 rounded-lg p-1"
                          >
                            <CachedImage
                              src={item.image_url}
                              alt={item.item_name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ))}
                        {offerItems.length > 3 && (
                          <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs font-semibold">
                              +{offerItems.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-green-400 font-bold mt-2">
                        {formatPrice(offer.total_offer_value)}
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="text-center">
                      <ArrowRight className="w-8 h-8 text-purple-400 mx-auto" />
                    </div>

                    {/* Requesting */}
                    <div>
                      <p className="text-gray-400 text-sm mb-2">
                        {iAmRecipient ? 'You offer' : 'They offer'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {requestItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="w-16 h-16 bg-gray-700 rounded-lg p-1"
                          >
                            <CachedImage
                              src={item.image_url}
                              alt={item.item_name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ))}
                        {requestItems.length > 3 && (
                          <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs font-semibold">
                              +{requestItems.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-blue-400 font-bold mt-2">
                        {formatPrice(offer.total_request_value)}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {offer.notes && (
                    <div className="mt-4 bg-gray-700/30 rounded-lg p-3">
                      <p className="text-gray-400 text-sm italic">{offer.notes}</p>
                    </div>
                  )}

                  {/* Cancellation Reason */}
                  {offer.cancellation_reason && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="text-red-300 text-sm">
                        <span className="font-semibold">Cancellation reason:</span>{' '}
                        {offer.cancellation_reason}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TradeOffersManager;
