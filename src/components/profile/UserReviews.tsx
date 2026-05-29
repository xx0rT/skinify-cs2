import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, ThumbsUp, MessageSquare, Shield, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import ReviewSubmissionModal from './ReviewSubmissionModal';

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
  reviewer: {
    display_name: string;
    avatar_url: string;
  };
}

interface UserReviewsProps {
  userId: string;
  steamId: string;
}

const UserReviews: React.FC<UserReviewsProps> = ({ userId, steamId }) => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [canReview, setCanReview] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [sellerName, setSellerName] = useState('Seller');
  const [actualUserId, setActualUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserIdAndReviews();
    checkCanReview();
  }, [userId, user]);

  const fetchUserIdAndReviews = async () => {
    try {
      setIsLoading(true);

      // First, get the actual user UUID from steam_id if userId is a steam_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('steam_id', userId)
        .maybeSingle();

      if (userError) throw userError;

      if (!userData) {
        console.error('User not found for steam_id:', userId);
        setIsLoading(false);
        return;
      }

      setActualUserId(userData.id);
      setSellerName(userData.display_name || 'Seller');

      // Fetch reviews using the actual UUID
      const { data: reviewsData, error } = await supabase
        .from('user_reviews')
        .select(`
          id,
          reviewer_id,
          rating,
          comment,
          is_verified_purchase,
          created_at,
          reviewer:users!user_reviews_reviewer_id_fkey(display_name, avatar_url)
        `)
        .eq('reviewed_user_id', userData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(reviewsData || []);

      // Fetch stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('average_rating, total_reviews')
        .eq('user_id', userData.id)
        .maybeSingle();

      if (statsData) {
        setAverageRating(parseFloat(statsData.average_rating) || 0);
        setTotalReviews(statsData.total_reviews || 0);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkCanReview = async () => {
    if (!user || !userId || user.steamId === steamId) {
      setCanReview(false);
      return;
    }

    try {
      // Check if user has completed order with this user
      const { data: completedOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'completed')
        .or(`buyer_steam_id.eq.${user.steamId},seller_steam_id.eq.${user.steamId}`)
        .or(`buyer_steam_id.eq.${steamId},seller_steam_id.eq.${steamId}`)
        .limit(1);

      // Check if user already reviewed
      const { data: existingReview } = await supabase
        .from('user_reviews')
        .select('id')
        .eq('reviewer_id', user.steamId)
        .eq('reviewed_user_id', userId)
        .maybeSingle();

      setCanReview(!!completedOrders && completedOrders.length > 0 && !existingReview);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !newReview.comment.trim() || !actualUserId) {
      addToast({
        type: 'error',
        message: 'Please provide a comment'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_reviews')
        .insert({
          reviewer_id: user.steamId,
          reviewed_user_id: actualUserId,
          rating: newReview.rating,
          comment: newReview.comment.trim(),
          is_verified_purchase: true
        });

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Review Posted',
        message: 'Your review has been submitted successfully'
      });

      setShowReviewForm(false);
      setNewReview({ rating: 5, comment: '' });
      fetchUserIdAndReviews();
      setCanReview(false);
    } catch (error: any) {
      console.error('Error submitting review:', error);
      addToast({
        type: 'error',
        title: 'Review Failed',
        message: error.message || 'Failed to submit review'
      });
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const starSize = size === 'sm' ? 16 : 24;
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={starSize}
            className={`${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderInteractiveStars = (rating: number, onChange: (rating: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={32}
              className={`${
                star <= rating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-600 hover:text-yellow-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="text-center text-gray-400">Loading reviews...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/60 to-purple-900/20 backdrop-blur-sm rounded-xl border border-purple-500/30 overflow-hidden shadow-xl">
      {/* Header with Stats */}
      <div className="p-8 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-fuchsia-900/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent flex items-center">
              <Star className="w-7 h-7 text-yellow-400 mr-3 drop-shadow-lg" />
              User Reviews
            </h3>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                {renderStars(Math.round(averageRating), 'lg')}
                <span className="text-2xl font-bold text-white">
                  {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
                </span>
              </div>
              <span className="text-gray-400">({totalReviews} reviews)</span>
            </div>
          </div>

          {canReview && !showReviewForm && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-purple-500/40"
            >
              <MessageSquare size={18} />
              <span>Write Review</span>
            </button>
          )}
        </div>
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-8 border-b border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 backdrop-blur-sm"
        >
          <h4 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-6">Write Your Review</h4>

          <div className="mb-4">
            <label className="text-gray-300 text-sm mb-2 block">Rating</label>
            {renderInteractiveStars(newReview.rating, (rating) =>
              setNewReview({ ...newReview, rating })
            )}
          </div>

          <div className="mb-4">
            <label className="text-gray-300 text-sm mb-2 block">Comment</label>
            <textarea
              value={newReview.comment}
              onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
              placeholder="Share your experience with this trader..."
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSubmitReview}
              className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-purple-500/40"
            >
              Submit Review
            </button>
            <button
              onClick={() => setShowReviewForm(false)}
              className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 border border-gray-700"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Reviews List */}
      <div className="divide-y divide-gray-700/30">
        {reviews.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No reviews yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Be the first to review this trader
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 hover:bg-purple-900/10 transition-all duration-300 border-l-2 border-transparent hover:border-purple-500/50"
            >
              <div className="flex items-start space-x-4">
                <img
                  src={review.reviewer.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.reviewer.display_name}`}
                  alt={review.reviewer.display_name}
                  className="w-14 h-14 rounded-full border-3 border-purple-400/40 shadow-lg shadow-purple-500/20"
                />

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold text-white">
                        {review.reviewer.display_name}
                      </span>
                      {review.is_verified_purchase && (
                        <span className="flex items-center space-x-1 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-1 text-xs text-green-400">
                          <Shield size={12} />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-gray-400 text-sm">
                      <Calendar size={14} />
                      <span>
                        {new Date(review.created_at).toLocaleDateString('cs-CZ')}
                      </span>
                    </div>
                  </div>

                  <div className="mb-2">{renderStars(review.rating)}</div>

                  <p className="text-gray-300 leading-relaxed">{review.comment}</p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <ReviewSubmissionModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        sellerSteamId={steamId}
        sellerName={sellerName}
        onReviewSubmitted={() => {
          fetchUserIdAndReviews();
          setShowReviewModal(false);
        }}
      />
    </div>
  );
};

export default UserReviews;
