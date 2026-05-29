import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { getSupabaseCredentials } from '../../utils/supabaseHelpers';

interface ReviewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerSteamId: string;
  sellerName: string;
  orderId?: string;
  onReviewSubmitted?: () => void;
}

const ReviewSubmissionModal: React.FC<ReviewSubmissionModalProps> = ({
  isOpen,
  onClose,
  sellerSteamId,
  sellerName,
  orderId,
  onReviewSubmitted
}) => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      addToast('Please log in to leave a review', 'error');
      return;
    }

    if (rating === 0) {
      addToast('Please select a rating', 'warning');
      return;
    }

    if (comment.trim().length < 10) {
      addToast('Please write a comment (at least 10 characters)', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const response = await fetch(`${supabaseUrl}/functions/v1/user-profile/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewer_steam_id: user.steamId,
          reviewed_steam_id: sellerSteamId,
          rating,
          comment: comment.trim(),
          order_id: orderId || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit review');
      }

      addToast('Review submitted successfully!', 'success');
      setRating(0);
      setComment('');
      onClose();
      onReviewSubmitted?.();
    } catch (error) {
      console.error('Failed to submit review:', error);
      addToast(error instanceof Error ? error.message : 'Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />

          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-900 rounded-2xl border border-gray-700/50 max-w-lg w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Leave a Review</h3>
                    <p className="text-gray-400 text-sm mt-1">for {sellerName}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-white font-medium mb-3">Rating</label>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            size={40}
                            className={`${
                              star <= (hoveredRating || rating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600'
                            } transition-colors`}
                          />
                        </button>
                      ))}
                      {rating > 0 && (
                        <span className="ml-3 text-gray-400">
                          {rating === 1 && 'Poor'}
                          {rating === 2 && 'Fair'}
                          {rating === 3 && 'Good'}
                          {rating === 4 && 'Very Good'}
                          {rating === 5 && 'Excellent'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Your Review</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your experience with this seller..."
                      className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                      maxLength={500}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {comment.length}/500 characters
                      </span>
                      {comment.length > 0 && comment.length < 10 && (
                        <span className="text-xs text-yellow-500 flex items-center space-x-1">
                          <AlertCircle size={12} />
                          <span>At least 10 characters required</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {orderId && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-blue-400 text-sm flex items-center space-x-2">
                        <AlertCircle size={16} />
                        <span>This review will be marked as a verified purchase</span>
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || rating === 0 || comment.trim().length < 10}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-lg"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting...</span>
                        </div>
                      ) : (
                        'Submit Review'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReviewSubmissionModal;
